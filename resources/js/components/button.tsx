import * as React from "react";

type Variant = "default" | "outline";

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
> = ({ variant = "default", className = "", ...props }) => {
  const base =
    "inline-flex items-center justify-center rounded-lg h-10 px-3 text-sm font-medium transition";
  const style =
    variant === "default"
      ? "bg-teal-600 text-white hover:bg-teal-700"
      : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50";
  return <button className={`${base} ${style} ${className}`} {...props} />;
};

export default Button;
