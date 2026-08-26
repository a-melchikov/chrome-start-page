const taskMarkerPattern = /^(\s*(?:(?:[-+*])|(?:\d+[.)]))\s+)\[([ xX])\]/;

export function toggleMarkdownTask(
  content: string,
  listItemOffset: number,
): string {
  if (listItemOffset < 0 || listItemOffset >= content.length) {
    return content;
  }

  const lineEnd = content.indexOf('\n', listItemOffset);
  const itemLine = content.slice(
    listItemOffset,
    lineEnd === -1 ? content.length : lineEnd,
  );
  const marker = taskMarkerPattern.exec(itemLine);

  if (!marker) {
    return content;
  }

  const markerPrefix = marker[1];

  if (markerPrefix === undefined) {
    return content;
  }

  const checkedOffset = listItemOffset + marker.index + markerPrefix.length + 1;
  const nextChecked = marker[2] === ' ' ? 'x' : ' ';

  return `${content.slice(0, checkedOffset)}${nextChecked}${content.slice(
    checkedOffset + 1,
  )}`;
}
