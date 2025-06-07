import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { WorkHoursRecord } from "./work-hours-log";
import { Loader2 } from "lucide-react";

interface EditWorkHoursDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: WorkHoursRecord | null;
    onSuccess: () => void;
}

export function EditWorkHoursDialog({ 
    open, 
    onOpenChange, 
    record, 
    onSuccess 
}: EditWorkHoursDialogProps) {
    const { toast } = useToast();
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        regularHours: "",
        overtimeHours: "",
        checkinTime: "",
        checkoutTime: "",
        status: ""
    });

    // Update form data when record changes
    useEffect(() => {
        if (record) {
            // Format time from ISO string to HH:MM format for input
            const formatTimeForInput = (timeString: string | null) => {
                if (!timeString) return "";
                try {
                    const date = new Date(timeString);
                    return date.toLocaleTimeString('en-GB', { 
                        hour12: false, 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    });
                } catch {
                    return "";
                }
            };

            setFormData({
                regularHours: record.regularHours?.toString() || "",
                overtimeHours: record.overtimeHours?.toString() || "",
                checkinTime: formatTimeForInput(record.checkinTime),
                checkoutTime: formatTimeForInput(record.checkoutTime),
                status: record.status || "normal"
            });
        }
    }, [record]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!record?.id) return;

        setIsLoading(true);
        try {
            // Convert time inputs back to full datetime strings
            const formatTimeForAPI = (timeString: string, baseDate: Date) => {
                if (!timeString) return null;
                const [hours, minutes] = timeString.split(':');
                const date = new Date(baseDate);
                date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                return date.toISOString();
            };

            // Use current date as base for time conversion
            const today = new Date();
            
            const updateData = {
                regularHours: parseFloat(formData.regularHours) || 0,
                overtimeHours: parseFloat(formData.overtimeHours) || 0,
                checkinTime: formData.checkinTime ? formatTimeForAPI(formData.checkinTime, today) : null,
                checkoutTime: formData.checkoutTime ? formatTimeForAPI(formData.checkoutTime, today) : null,
                status: formData.status
            };

            const response = await fetch(`/api/work-hours/${record.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update work hours');
            }

            toast({
                title: t('common.success'),
                description: "Cập nhật thông tin chấm công thành công",
            });

            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('Error updating work hours:', error);
            toast({
                title: t('common.error'),
                description: error instanceof Error ? error.message : "Có lỗi xảy ra khi cập nhật",
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
                    <DialogTitle>Chỉnh sửa thông tin chấm công</DialogTitle>
                    <DialogDescription>
                        Cập nhật thông tin chấm công cho nhân viên: {record?.employeeName}
                    </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="regularHours">Giờ làm thường</Label>
                            <Input
                                id="regularHours"
                                type="number"
                                step="0.01"
                                min="0"
                                max="24"
                                value={formData.regularHours}
                                onChange={(e) => setFormData(prev => ({ 
                                    ...prev, 
                                    regularHours: e.target.value 
                                }))}
                                placeholder="8.00"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="overtimeHours">Giờ tăng ca</Label>
                            <Input
                                id="overtimeHours"
                                type="number"
                                step="0.01"
                                min="0"
                                max="12"
                                value={formData.overtimeHours}
                                onChange={(e) => setFormData(prev => ({ 
                                    ...prev, 
                                    overtimeHours: e.target.value 
                                }))}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="checkinTime">Giờ vào</Label>
                            <Input
                                id="checkinTime"
                                type="time"
                                value={formData.checkinTime}
                                onChange={(e) => setFormData(prev => ({ 
                                    ...prev, 
                                    checkinTime: e.target.value 
                                }))}
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="checkoutTime">Giờ ra</Label>
                            <Input
                                id="checkoutTime"
                                type="time"
                                value={formData.checkoutTime}
                                onChange={(e) => setFormData(prev => ({ 
                                    ...prev, 
                                    checkoutTime: e.target.value 
                                }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Trạng thái</Label>
                        <Select
                            value={formData.status}
                            onValueChange={(value) => setFormData(prev => ({ 
                                ...prev, 
                                status: value 
                            }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="normal">Bình thường</SelectItem>
                                <SelectItem value="late">Đi muộn</SelectItem>
                                <SelectItem value="early_leave">Về sớm</SelectItem>
                                <SelectItem value="absent">Vắng mặt</SelectItem>
                                <SelectItem value="leave">Nghỉ phép</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Hủy
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Cập nhật
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
