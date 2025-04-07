declare module 'react-lineto' {
  import { Component, ComponentType } from 'react';

  export interface LineToProps {
    from: string;
    to: string;
    className?: string;
    borderColor?: string;
    borderStyle?: string;
    borderWidth?: number;
    zIndex?: number;
  }

  export default class LineTo extends Component<LineToProps> {}

  export class SteppedLineTo extends Component<LineToProps & { orientation: 'h' | 'v' }> {}

  export interface LineProps {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    className?: string;
    borderColor?: string;
    borderStyle?: string;
    borderWidth?: number;
  }

  export class Line extends Component<LineProps> {}
}
