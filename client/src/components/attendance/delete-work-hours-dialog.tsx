import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { WorkHoursRecord } from "./work-hours-log";
import { Loader2, AlertTriangle } from "lucide-react";

interface DeleteWorkHoursDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: WorkHoursRecord | null;
    onSuccess: () => void;
}

export function DeleteWorkHoursDialog({ 
    open, 
    onOpenChange, 
    record, 
    onSuccess 
}: DeleteWorkHoursDialogProps) {
    const { toast } = useToast();
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);

    const handleDelete = async () => {
        if (!record?.id) return;

        setIsLoading(true);
        try {
            const response = await fetch(`/api/work-hours/${record.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete work hours');
            }

            toast({
                title: t('common.success'),
                description: "Xóa thông tin chấm công thành công",
            });

            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('Error deleting work hours:', error);
            toast({
                title: t('common.error'),
                description: error instanceof Error ? error.message : "Có lỗi xảy ra khi xóa",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        Xác nhận xóa
                    </DialogTitle>
                    <DialogDescription>
                        Bạn có chắc chắn muốn xóa thông tin chấm công của nhân viên{" "}
                        <span className="font-semibold">{record?.employeeName}</span>?
                        <br />
                        <br />
                        <span className="text-red-600">
                            Hành động này không thể hoàn tác.
                        </span>
                    </DialogDescription>
                </DialogHeader>
                
                <DialogFooter>
                    <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        Hủy
                    </Button>
                    <Button 
                        type="button" 
                        variant="destructive" 
                        onClick={handleDelete}
                        disabled={isLoading}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Xóa
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
