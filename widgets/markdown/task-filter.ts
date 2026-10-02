import type { Plugin } from 'unified';

interface TaskFilterOptions {
  hideCompletedTasks?: boolean;
}

interface MdastNode {
  type: string;
  checked?: boolean | null;
  children?: MdastNode[];
  value?: string;
  [key: string]: unknown;
}

function hasIncompleteTaskDescendant(node: MdastNode): boolean {
  if (node.checked === false) {
    return true;
  }

  if (Array.isArray(node.children)) {
    return node.children.some(hasIncompleteTaskDescendant);
  }

  return false;
}

function filterNodeChildren(
  children: MdastNode[],
  hideCompleted: boolean,
): MdastNode[] {
  const result: MdastNode[] = [];

  for (const child of children) {
    if (child.type === 'listItem' && hideCompleted && child.checked === true) {
      if (!hasIncompleteTaskDescendant(child)) {
        // Skip completed task without incomplete descendants
        continue;
      }
    }

    if (Array.isArray(child.children)) {
      result.push({
        ...child,
        children: filterNodeChildren(child.children, hideCompleted),
      });
    } else {
      result.push(child);
    }
  }

  return result;
}

export const remarkTaskFilterPlugin: Plugin<[TaskFilterOptions?]> = (
  options = {},
) => {
  return (tree: unknown) => {
    if (!options.hideCompletedTasks) {
      return;
    }

    const root = tree as unknown as MdastNode;
    if (Array.isArray(root.children)) {
      root.children = filterNodeChildren(root.children, true);
    }
  };
};

export interface TaskFilterStats {
  totalTasks: number;
  completedTasks: number;
  hasOtherContent: boolean;
}

export function analyzeTaskContent(content: string): TaskFilterStats {
  const lines = content.split('\n');
  let totalTasks = 0;
  let completedTasks = 0;
  let hasOtherContent = false;

  const taskRegex = /^\s*(?:[-*+]|\d+[.)])\s+\[([ xX])\]/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = taskRegex.exec(trimmed);
    if (match) {
      totalTasks++;
      if (match[1] === 'x' || match[1] === 'X') {
        completedTasks++;
      }
    } else {
      hasOtherContent = true;
    }
  }

  return {
    totalTasks,
    completedTasks,
    hasOtherContent,
  };
}
