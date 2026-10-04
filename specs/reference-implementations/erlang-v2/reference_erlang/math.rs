/// Neumaier summation retains small terms when accumulating probability mass.
#[derive(Default)]
pub(crate) struct Sum {
    sum: f64,
    correction: f64,
}

impl Sum {
    pub fn add(&mut self, value: f64) {
        let next = self.sum + value;
        self.correction += if self.sum.abs() >= value.abs() {
            (self.sum - next) + value
        } else {
            (value - next) + self.sum
        };
        self.sum = next;
    }
    pub fn value(&self) -> f64 {
        self.sum + self.correction
    }
}
