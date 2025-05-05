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

  // Hardcoded department names due to API issues
  const departmentMap = {
    1: { name: 'DS', description: 'Phòng Design' },
    2: { name: 'HR', description: 'Phòng Nhân sự' }
  };

  const department = employee.departmentId ? departmentMap[employee.departmentId as keyof typeof departmentMap] : null;

  // Delete employee mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/employees/${employee.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Employee Deleted",
        description: "The employee has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete employee: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'on_leave':
        return <Badge className="bg-amber-500 hover:bg-amber-600">On Leave</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6 flex flex-col items-center">
        <Avatar className="h-20 w-20 mb-4">
          <AvatarFallback className="bg-primary text-primary-foreground">
            {getInitials(employee.firstName, employee.lastName)}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-semibold text-lg">{employee.firstName} {employee.lastName}</h3>
        <p className="text-sm text-muted-foreground mb-2">{employee.position || 'No position'}</p>
        {getStatusBadge(employee.status)}
      </div>

      <Separator />

      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Employee ID</span>
            <span className="text-sm font-medium">{employee.employeeId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Department</span>
            <span className="text-sm font-medium">{department?.name || 'Not assigned'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Joined</span>
            <span className="text-sm font-medium">{formatJoinDate(employee.joinDate)}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-muted/20 p-4 flex justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/employees/${employee.id}`}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/employees/${employee.id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete {employee.firstName} {employee.lastName}'s
                record and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteEmployeeMutation.mutate()}
              >
                {deleteEmployeeMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
