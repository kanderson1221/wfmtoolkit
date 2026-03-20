export const fieldInputClass =
  'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'

export const fieldInputCompactClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#15395f] focus:ring-4 focus:ring-[#d7e3ec]'

export const tableFieldInputClass =
  'w-full rounded-md border border-slate-200 bg-slate-50/70 px-2 py-1.5 text-center text-sm tabular-nums text-slate-900 shadow-none outline-none transition placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

export const buildDialogPt = (maxWidthClass = 'max-w-4xl') => ({
  mask: {
    class: 'bg-slate-950/60 backdrop-blur-sm p-4'
  },
  root: {
    class: `w-full ${maxWidthClass} overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.22)]`
  },
  header: {
    class: 'px-6 pt-6 pb-0'
  },
  content: {
    class: 'px-6 py-5'
  },
  footer: {
    class: 'px-6 pb-6 pt-0'
  }
})

export const menuPanelPt = {
  root: {
    class:
      'mt-2 w-72 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-2 shadow-[0_24px_48px_rgba(15,23,42,0.18)]'
  },
  list: {
    class: 'grid gap-1'
  }
}

export const compactMenuPanelPt = {
  root: {
    class:
      'mt-2 min-w-[9rem] overflow-hidden rounded-[20px] border border-slate-200 bg-white p-1.5 shadow-[0_18px_36px_rgba(15,23,42,0.14)]'
  },
  list: {
    class: 'grid gap-1'
  }
}
