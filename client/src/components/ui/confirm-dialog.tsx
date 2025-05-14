import { useTranslation } from "react-i18next";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    title?: string;
    titleKey?: string;
    description?: string;
    descriptionKey?: string;
    confirmText?: string;
    confirmTextKey?: string;
    cancelText?: string;
    cancelTextKey?: string;
    variant?: "default" | "destructive";
}

export function ConfirmDialog({
    open,
    onOpenChange,
    onConfirm,
    title,
    titleKey = "common.confirm",
    description,
    descriptionKey = "common.confirmDelete",
    confirmText,
    confirmTextKey = "common.confirm",
    cancelText,
    cancelTextKey = "common.cancel",
    variant = "default",
}: ConfirmDialogProps) {
    const { t } = useTranslation();

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {title || t(titleKey)}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {description || t(descriptionKey)}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>
                        {cancelText || t(cancelTextKey)}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className={variant === "destructive" ? "bg-destructive hover:bg-destructive/90" : ""}
                    >
                        {confirmText || t(confirmTextKey)}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}