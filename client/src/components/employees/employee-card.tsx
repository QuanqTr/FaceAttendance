import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Employee } from "@shared/schema";
import { Link } from "wouter";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useI18nToast } from "@/hooks/use-i18n-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type EmployeeCardProps = {
  employee: Employee;
};

// Robust date formatting helper function that handles various date formats
function formatJoinDate(dateValue: any): string {
  if (!dateValue) return 'Not specified';

  try {
    let date;

    if (typeof dateValue === 'string') {
      // Try different parsing approaches based on the format
      if (dateValue.includes('T')) {
        // ISO format with time: 2025-05-05T00:00:00.000Z
        date = new Date(dateValue);
      } else {
        // Simple date format: 2025-05-05
        const parts = dateValue.split('-');
        if (parts.length === 3) {
          // Create date with proper parts interpretation
          date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
          date = new Date(dateValue);
        }
      }
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      date = new Date(dateValue);
    }

    // Validate that we have a valid date
    if (isNaN(date.getTime())) {
      console.error("Invalid date detected:", dateValue);
      return 'Invalid date';
    }

    return format(date, 'MMM d, yyyy');
  } catch (error) {
    console.error("Error formatting date:", error, dateValue);
    return 'Error parsing date';
  }
}

export function EmployeeCard({ employee }: EmployeeCardProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const i18nToast = useI18nToast();

  // Get department info from API response
  const departmentName = (employee as any).departmentName;
  const departmentDescription = (employee as any).departmentDescription;

  // Delete employee mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/employees/${employee.id}`);
    },
    onSuccess: () => {
      i18nToast.success('employees.deleteSuccess', 'employees.deleteSuccessMessage');
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    },
    onError: (error) => {
      i18nToast.error('common.error', 'employees.deleteError', { error: error.message });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600">{t('employees.active')}</Badge>;
      case 'inactive':
        return <Badge variant="secondary">{t('employees.inactive')}</Badge>;
      case 'on_leave':
        return <Badge className="bg-amber-500 hover:bg-amber-600">{t('employees.onLeave')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'N/A';
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6 flex flex-col items-center">
        <Avatar className="h-20 w-20 mb-4">
          <AvatarFallback className="bg-primary text-primary-foreground">
            {getInitials(employee.firstName, employee.lastName)}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-semibold text-lg">{employee.lastName} {employee.firstName}</h3>
        <p className="text-sm text-muted-foreground mb-2">{employee.position || t('employees.noPosition')}</p>
        {getStatusBadge(employee.status)}
      </div>

      <Separator />

      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">{t('employees.id')}</span>
            <span className="text-sm font-medium">{employee.employeeId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">{t('employees.department')}</span>
            <span className="text-sm font-medium">{departmentDescription || departmentName || t('employees.notAssigned')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">{t('employees.joined')}</span>
            <span className="text-sm font-medium">{formatJoinDate(employee.joinDate)}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-muted/20 p-4 flex justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/employees/${employee.id}`}>
            <Eye className="mr-2 h-4 w-4" />
            {t('common.view')}
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/employees/${employee.id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            {t('common.edit')}
          </Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              {t('common.delete')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('employees.confirmDelete')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('employees.deleteWarning', { name: `${employee.firstName} ${employee.lastName}` })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteEmployeeMutation.mutate()}
              >
                {deleteEmployeeMutation.isPending ? t('employees.deleting') : t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
