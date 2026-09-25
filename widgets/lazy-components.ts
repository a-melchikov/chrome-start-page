import { lazy } from 'react';

export const MarkdownWidget = lazy(() =>
  import('./markdown/MarkdownWidget').then((module) => ({
    default: module.MarkdownWidget,
  })),
);
export const MarkdownWidgetEditor = lazy(() =>
  import('./markdown/MarkdownWidgetEditor').then((module) => ({
    default: module.MarkdownWidgetEditor,
  })),
);
export const SearchWidget = lazy(() =>
  import('./search/SearchWidget').then((module) => ({
    default: module.SearchWidget,
  })),
);
export const SearchWidgetEditor = lazy(() =>
  import('./search/SearchWidgetEditor').then((module) => ({
    default: module.SearchWidgetEditor,
  })),
);
export const PomodoroWidget = lazy(() =>
  import('./pomodoro/PomodoroWidget').then((module) => ({
    default: module.PomodoroWidget,
  })),
);
export const PomodoroWidgetEditor = lazy(() =>
  import('./pomodoro/PomodoroWidgetEditor').then((module) => ({
    default: module.PomodoroWidgetEditor,
  })),
);
export const ImageWidget = lazy(() =>
  import('./image/ImageWidget').then((module) => ({
    default: module.ImageWidget,
  })),
);
export const ImageWidgetEditor = lazy(() =>
  import('./image/ImageWidgetEditor').then((module) => ({
    default: module.ImageWidgetEditor,
  })),
);
export const ClockWidget = lazy(() =>
  import('./clock/ClockWidget').then((module) => ({
    default: module.ClockWidget,
  })),
);
export const ClockWidgetEditor = lazy(() =>
  import('./clock/ClockWidgetEditor').then((module) => ({
    default: module.ClockWidgetEditor,
  })),
);
