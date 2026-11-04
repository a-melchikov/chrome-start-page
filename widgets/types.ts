import type { WidgetAppearance } from '../storage/widget-appearance';

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BaseWidgetConfig<TType extends string> {
  id: string;
  type: TType;
  title?: string;
  appearance?: WidgetAppearance;
  layout: WidgetLayout;
}
