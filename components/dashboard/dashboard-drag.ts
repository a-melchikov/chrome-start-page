const INTERACTIVE_ELEMENT_SELECTOR =
  'button, input, textarea, select, option, label, a, [contenteditable="true"], [role="slider"], dialog, dialog *, [data-no-drag], [data-no-drag] *';

export function createDashboardDragConfig(isEditing: boolean) {
  return {
    enabled: isEditing,
    // The grid grows from its current content. Bounding drag to that height
    // makes every empty row below the last widget unreachable.
    bounded: false,
    cancel: INTERACTIVE_ELEMENT_SELECTOR,
  } as const;
}
