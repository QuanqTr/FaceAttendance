import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Employee } from "@shared/schema";
import { Link } from "wouter";
import { Eye, Pencil, User } from "lucide-react";
import { format } from "date-fns";

type EmployeeCardProps = {
  employee: Employee;
};

export function EmployeeCard({ employee }: EmployeeCardProps) {
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
            <span className="text-sm font-medium">{employee.departmentId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Joined</span>
            <span className="text-sm font-medium">{format(new Date(employee.joinDate), 'MMM d, yyyy')}</span>
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
      </CardFooter>
    </Card>
  );
}
