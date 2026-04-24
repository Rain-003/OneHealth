import * as React from "react";

export const Label: React.FC<
  React.LabelHTMLAttributes<HTMLLabelElement>
> = ({ className = "", ...props }) => (
  <label
    className={`block text-[0.95rem] font-medium text-slate-800 ${className}`}
    {...props}
  />
);

export default Label;
