/**
 * AreaScan UI primitives — barrel export.
 *
 * Import from "@/components/ui" rather than deep paths so component locations
 * can be refactored without touching consumers.
 */
export { Button, buttonVariants, type ButtonProps } from "./Button";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  CardFooter,
} from "./Card";
export { Input, type InputProps } from "./Input";
export { Label, type LabelProps } from "./Label";
export { FieldError } from "./FieldError";
export { Badge, badgeVariants, type BadgeProps } from "./Badge";
export { Spinner, spinnerVariants, type SpinnerProps } from "./Spinner";
export { Modal, type ModalProps } from "./Modal";
