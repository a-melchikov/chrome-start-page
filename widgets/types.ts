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
  layout: WidgetLayout;
}
