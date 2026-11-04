import { createContext } from 'react';
import { DEFAULT_APPEARANCE } from '../../storage/defaults';

export const WidgetAppearanceContext = createContext(DEFAULT_APPEARANCE);
