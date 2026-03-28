import { computed, ref } from 'vue'

export const useConfirmDialog = () => {
  const pendingConfirmation = ref(null)

  const dialogVisible = computed({
    get: () => Boolean(pendingConfirmation.value),
    set: (value) => {
      if (!value) {
        pendingConfirmation.value = null
      }
    }
  })

  const dialogTitle = computed(() => pendingConfirmation.value?.title || '')
  const dialogDescription = computed(() => pendingConfirmation.value?.description || '')
  const dialogConfirmLabel = computed(() => pendingConfirmation.value?.confirmLabel || 'Confirm')
  const dialogConfirmVariant = computed(() => pendingConfirmation.value?.confirmVariant || 'danger')
  const dialogKicker = computed(() => pendingConfirmation.value?.kicker || '')

  const requestConfirmation = ({
    title,
    description = '',
    confirmLabel = 'Confirm',
    confirmVariant = 'danger',
    kicker = '',
    onConfirm
  }) => {
    pendingConfirmation.value = {
      title,
      description,
      confirmLabel,
      confirmVariant,
      kicker,
      onConfirm
    }
  }

  const confirmPendingAction = () => {
    const confirmAction = pendingConfirmation.value?.onConfirm
    pendingConfirmation.value = null
    confirmAction?.()
  }

  return {
    dialogVisible,
    dialogTitle,
    dialogDescription,
    dialogConfirmLabel,
    dialogConfirmVariant,
    dialogKicker,
    requestConfirmation,
    confirmPendingAction
  }
}
