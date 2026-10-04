//! Exact tagged-caller waiting-time CDFs for Erlang A.
//!
//! Conditional on eventual service, the wait of queue position `j` is a sum
//! of independent exponentials with rates `c + k * theta`, `k = 1..=j`.
//! Its CDF is `I_(1-exp(-theta*t))(j, 1+c/theta)`, equivalently the upper
//! tail at `j` of a negative binomial distribution. Evaluating these tails
//! replaces the time discretization and stability restrictions of RK4.
//! See the incomplete-beta recurrence in NIST DLMF, §8.17.20:
//! <https://dlmf.nist.gov/8.17.E20>.

use crate::Error;

const MAX_TERMS: usize = 1_000_000;
const TAIL_RELATIVE_TOLERANCE: f64 = 2.0e-15;

#[derive(Default)]
struct CompensatedSum {
    value: f64,
    correction: f64,
}

impl CompensatedSum {
    fn from(value: f64) -> Self {
        Self {
            value,
            correction: 0.0,
        }
    }

    fn add(&mut self, value: f64) {
        let adjusted = value - self.correction;
        let sum = self.value + adjusted;
        self.correction = (sum - self.value) - adjusted;
        self.value = sum;
    }
}

/// Reusable storage for conditional waiting-time probabilities and PMF masses.
/// Capacity grows to the largest calculation and is retained until released.
#[derive(Default)]
pub(crate) struct WaitingTimeScratch {
    result: Vec<f64>,
    masses: Vec<f64>,
}

impl WaitingTimeScratch {
    #[cfg(test)]
    pub(crate) fn capacities(&self) -> (usize, usize) {
        (self.result.capacity(), self.masses.capacity())
    }

    pub(crate) fn release_buffers(&mut self) {
        self.result = Vec::new();
        self.masses = Vec::new();
    }

    /// Conditional probability of service by the target, given eventual service.
    /// Index zero is one. Rates and times must use the same units.
    /// The returned slice is valid until the next mutation of this scratch space.
    pub(crate) fn service_cdfs(
        &mut self,
        service_capacity: f64,
        patience_ratio: f64,
        target_in_handle_times: f64,
        positions: usize,
    ) -> Result<&[f64], Error> {
        self.result.clear();
        self.masses.clear();
        if positions > MAX_TERMS {
            return Err(Error::StateLimit { limit: MAX_TERMS });
        }
        if !service_capacity.is_finite()
            || service_capacity < 0.0
            || !patience_ratio.is_finite()
            || patience_ratio < 0.0
            || target_in_handle_times.is_nan()
            || target_in_handle_times < 0.0
        {
            return Err(Error::NumericalFailure("invalid waiting-time parameters"));
        }
        let result = &mut self.result;
        result.resize(positions + 1, 1.0);
        if positions == 0 {
            return Ok(result);
        }
        if target_in_handle_times == 0.0 {
            result[1..].fill(0.0);
            return Ok(result);
        }
        if target_in_handle_times.is_infinite() {
            return Ok(result);
        }

        // Compute the two products separately: (c + theta) can overflow even
        // when the time products are representable. This also avoids c/theta
        // overflowing when patience tends to infinity.
        let service_time_product = service_capacity * target_in_handle_times;
        let patience_time_product = patience_ratio * target_in_handle_times;
        let initial_exponent = service_time_product + patience_time_product;
        if initial_exponent.is_infinite() {
            // For at most MAX_TERMS queue positions this limit has CDF one.
            return Ok(result);
        }
        if initial_exponent == 0.0 {
            result[1..].fill(0.0);
            return Ok(result);
        }
        let ratio_factor = if patience_time_product == 0.0 {
            1.0
        } else {
            -(-patience_time_product).exp_m1() / patience_time_product
        };

        // q_k/q_(k-1) = (1 + c/(k*theta))*(1-exp(-theta*t)).
        // This algebraic form remains well conditioned as theta tends to zero;
        // in that limit the negative binomial tends exactly to Poisson(c*t).
        let pmf_ratio = |position: usize| {
            (service_time_product / position as f64 + patience_time_product) * ratio_factor
        };
        let mut log_pmf = CompensatedSum::from(-initial_exponent);
        let mut lower_mass = CompensatedSum::default();
        let masses = &mut self.masses;
        masses.reserve(positions);
        for position in 0..positions {
            if position > 0 {
                let ratio = pmf_ratio(position);
                if ratio == 0.0 {
                    // Every following mass is also below floating-point range.
                    masses.resize(positions, 0.0);
                    break;
                }
                log_pmf.add(ratio.ln());
            }
            let mass = log_pmf.value.exp();
            if !mass.is_finite() {
                return Err(Error::NumericalFailure("non-finite waiting-time mass"));
            }
            masses.push(mass);
            lower_mass.add(mass);
            result[position + 1] = (1.0 - lower_mass.value).clamp(0.0, 1.0);
        }

        if lower_mass.value <= 0.5 {
            // All requested survival probabilities are at least one half;
            // subtraction is well conditioned, and a possibly enormous upper
            // tail never needs to be traversed.
            return Ok(result);
        }

        // For small survival probabilities, sum the positive upper tail and
        // work backwards instead of subtracting an almost-one lower CDF.
        // Successive ratios decrease, so the remaining geometric series gives
        // an explicit tail bound. Normalize once to remove shared PMF drift.
        let mut upper_mass = CompensatedSum::default();
        let mut converged = false;
        for offset in 0..MAX_TERMS {
            let position = positions + offset;
            let ratio = pmf_ratio(position);
            if ratio == 0.0 {
                converged = true;
                break;
            }
            log_pmf.add(ratio.ln());
            let mass = log_pmf.value.exp();
            upper_mass.add(mass);
            let next_ratio = pmf_ratio(position + 1);
            if next_ratio < 1.0 {
                let remainder_bound = mass * next_ratio / (1.0 - next_ratio);
                if remainder_bound <= TAIL_RELATIVE_TOLERANCE * upper_mass.value {
                    converged = true;
                    break;
                }
            }
        }
        if !converged {
            return Err(Error::StateLimit { limit: MAX_TERMS });
        }
        let total = lower_mass.value + upper_mass.value;
        if !total.is_finite() || total <= 0.0 {
            return Err(Error::NumericalFailure(
                "invalid waiting-time normalization",
            ));
        }
        result[positions] = (upper_mass.value / total).clamp(0.0, 1.0);
        for position in (1..positions).rev() {
            upper_mass.add(masses[position]);
            result[position] = (upper_mass.value / total).clamp(0.0, 1.0);
        }
        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::{WaitingTimeScratch, MAX_TERMS};
    use crate::Error;

    fn service_cdfs(
        service_capacity: f64,
        patience_ratio: f64,
        target_in_handle_times: f64,
        positions: usize,
    ) -> Result<Vec<f64>, Error> {
        WaitingTimeScratch::default()
            .service_cdfs(
                service_capacity,
                patience_ratio,
                target_in_handle_times,
                positions,
            )
            .map(<[f64]>::to_vec)
    }

    fn assert_close(actual: f64, expected: f64, tolerance: f64) {
        assert!(
            (actual - expected).abs() <= tolerance,
            "actual={actual:.17e}, expected={expected:.17e}"
        );
    }

    #[test]
    fn first_position_is_one_exponential() {
        for capacity in [1.0, 30.0, 1_000.0] {
            for theta in [0.0, 1.0e-300, 0.01, 1.0, 100.0] {
                for target in [0.0, 1.0e-16, 0.001, 1.0, 1_000.0] {
                    let values = service_cdfs(capacity, theta, target, 1).unwrap();
                    let expected = -(-(capacity + theta) * target).exp_m1();
                    assert_close(values[1], expected, 3.0e-14);
                }
            }
        }
    }

    #[test]
    fn equal_service_and_patience_with_one_agent_has_closed_form() {
        // NB shape=2: P(K>=j) = x^j * (1 + j*(1-x)).
        for target in [0.001_f64, 0.1, 1.0, 4.0] {
            let values = service_cdfs(1.0, 1.0, target, 100).unwrap();
            let success = (-target).exp();
            let failure = -(-target).exp_m1();
            for (position, actual) in values.iter().copied().enumerate() {
                let expected = failure.powi(position as i32) * (1.0 + position as f64 * success);
                assert_close(actual, expected, 5.0e-14);
            }
        }
    }

    #[test]
    fn tiny_tail_keeps_relative_accuracy() {
        let target = 1.0e-12;
        let values = service_cdfs(1.0, 1.0, target, 4).unwrap();
        let success = (-target).exp();
        let failure = -(-target).exp_m1();
        for (position, actual) in values.iter().copied().enumerate().skip(1) {
            let expected = failure.powi(position as i32) * (1.0 + position as f64 * success);
            assert_close(actual / expected, 1.0, 5.0e-14);
        }
    }

    #[test]
    fn large_initial_exponent_recovers_underflowed_start() {
        let values = service_cdfs(1_000.0, 1.0, 1.0, 3_000).unwrap();
        assert!(values[1_600] > 0.9);
        assert!(values[1_900] < 0.01);
        assert!(values.windows(2).all(|pair| pair[0] >= pair[1]));
        assert!(values.iter().all(|value| value.is_finite()));
    }

    #[test]
    fn fractional_shape_matches_high_precision_reference() {
        // Independently evaluated using 75-digit Decimal arithmetic and the
        // positive negative-binomial probability series (without logarithms).
        let values = service_cdfs(17.0, 0.37, 0.2, 12).unwrap();
        for (position, expected) in [
            (1, 0.969_007_188_856_921_4),
            (2, 0.865_225_442_316_460_5),
            (5, 0.297_308_681_777_787_85),
            (8, 0.036_539_356_835_600_27),
            (12, 0.000_691_961_816_773_998_8),
        ] {
            assert_close(values[position], expected, 5.0e-14);
        }
    }

    #[test]
    fn near_zero_abandonment_matches_poisson_limit_at_large_capacity() {
        let values = service_cdfs(100_000.0, 1.0e-20, 1.0, 100_500).unwrap();
        for (position, expected) in [
            (99_500, 0.943_347_991_052_959_6),
            (100_000, 0.500_420_522_110_365_2),
            (100_500, 0.057_194_176_108_102_6),
        ] {
            assert_close(values[position], expected, 5.0e-13);
        }
    }

    #[test]
    fn enormous_target_needs_no_upper_tail_traversal() {
        let values = service_cdfs(1.0, 1.0, 1.0e300, 100).unwrap();
        assert!(values.iter().all(|&value| value == 1.0));
    }

    #[test]
    fn scratch_reuses_both_allocations_across_sizes_and_early_returns() {
        let mut scratch = WaitingTimeScratch::default();
        scratch.service_cdfs(1_000.0, 1.0, 1.0, 3_000).unwrap();
        let result_ptr = scratch.result.as_ptr();
        let masses_ptr = scratch.masses.as_ptr();
        let result_capacity = scratch.result.capacity();
        let masses_capacity = scratch.masses.capacity();

        for (capacity, theta, target, positions) in [
            (17.0, 0.37, 0.2, 12),
            (1.0, 1.0, 0.0, 40),
            (1.0, 1.0, 1.0, 0),
            (1.0, 1.0, f64::INFINITY, 80),
            (f64::MAX, 1.0, 2.0, 100),
            (0.0, 0.0, 1.0, 30),
            (1.0, 1.0, 1.0e300, 100),
            (1.0, 1.0, 1.0e-12, 4),
            (1_000.0, 1.0, 1.0, 3_000),
        ] {
            let expected = service_cdfs(capacity, theta, target, positions).unwrap();
            let actual = scratch
                .service_cdfs(capacity, theta, target, positions)
                .unwrap();
            assert_eq!(actual, expected);
            assert_eq!(actual.len(), positions + 1);
            assert_eq!(scratch.result.as_ptr(), result_ptr);
            assert_eq!(scratch.masses.as_ptr(), masses_ptr);
            assert_eq!(scratch.result.capacity(), result_capacity);
            assert_eq!(scratch.masses.capacity(), masses_capacity);
        }
    }

    #[test]
    fn scratch_recovers_after_invalid_parameters_and_state_limit() {
        let mut scratch = WaitingTimeScratch::default();
        scratch.service_cdfs(1.0, 1.0, 1.0, 100).unwrap();
        for (capacity, theta, target, positions) in [
            (f64::NAN, 1.0, 1.0, 4),
            (1.0, -1.0, 1.0, 4),
            (1.0, 1.0, -1.0, 4),
            (1.0, 1.0, 1.0, MAX_TERMS + 1),
        ] {
            assert!(scratch
                .service_cdfs(capacity, theta, target, positions)
                .is_err());
            assert!(scratch.result.is_empty());
            assert!(scratch.masses.is_empty());
            let expected = service_cdfs(17.0, 0.37, 0.2, 12).unwrap();
            assert_eq!(scratch.service_cdfs(17.0, 0.37, 0.2, 12).unwrap(), expected);
        }
    }

    #[test]
    fn scratch_recovers_after_upper_tail_does_not_converge() {
        let mut scratch = WaitingTimeScratch::default();
        // This broad geometric distribution needs more than MAX_TERMS upper
        // tail terms. The error happens after both buffers have been populated.
        assert!(matches!(
            scratch.service_cdfs(0.0, 1.0, 100_000.0_f64.ln(), 100_000),
            Err(Error::StateLimit { limit: MAX_TERMS })
        ));
        assert!(!scratch.result.is_empty());
        assert!(!scratch.masses.is_empty());
        let expected = service_cdfs(1.0, 1.0, 0.1, 8).unwrap();
        assert_eq!(scratch.service_cdfs(1.0, 1.0, 0.1, 8).unwrap(), expected);
        assert_eq!(scratch.result.len(), 9);
        assert_eq!(scratch.masses.len(), 8);
    }

    #[test]
    fn scratch_releases_capacity_and_can_be_used_again() {
        let mut scratch = WaitingTimeScratch::default();
        scratch.service_cdfs(1.0, 1.0, 0.1, 100).unwrap();
        assert!(scratch.result.capacity() >= 101);
        assert!(scratch.masses.capacity() >= 100);
        scratch.release_buffers();
        assert_eq!(scratch.result.capacity(), 0);
        assert_eq!(scratch.masses.capacity(), 0);
        let expected = service_cdfs(1.0, 1.0, 0.1, 8).unwrap();
        assert_eq!(scratch.service_cdfs(1.0, 1.0, 0.1, 8).unwrap(), expected);
    }
}
