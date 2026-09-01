import * as React from 'react';
import { EDM_CLASS } from '@/lib/email/responsive';
import { useSelectable } from '@/builder/preview/PreviewEditContext';

export interface SpacerProps {
  height?: number;
  backgroundColor?: string;
}

export const Spacer: React.FC<SpacerProps> = ({
  height = 32,
  backgroundColor = '#ffffff',
}) => {
  const heightSel = useSelectable('height');
  return (
    <table
      width={600}
      cellPadding={0}
      cellSpacing={0}
      className={EDM_CLASS.wrapper}
      style={{ width: '600px', backgroundColor }}
      role="presentation"
    >
      <tr>
        <td
          {...heightSel}
          style={{
            height: `${height}px`,
            lineHeight: `${height}px`,
            fontSize: '0',
          }}
        >
          &nbsp;
        </td>
      </tr>
    </table>
  );
};

export default Spacer;
