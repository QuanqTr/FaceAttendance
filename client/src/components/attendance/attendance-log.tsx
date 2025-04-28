import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2, Search } from "lucide-react";

type AttendanceRecord = {
  id: number;
  employeeId: number;
  employeeName: string;
  departmentName: string;
  date: string;
  timeIn?: string;
  timeOut?: string;
  status: 'present' | 'absent' | 'late';
};

type AttendanceLogProps = {
  records: AttendanceRecord[];
  isLoading: boolean;
  date: Date;
  showSearch?: boolean;
};

export function AttendanceLog({ records, isLoading, date, showSearch = true }: AttendanceLogProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRecords = records?.filter(record => 
    record.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.departmentName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const exportAttendance = () => {
    toast({
      title: "Export Started",
      description: "Your attendance data is being exported as CSV.",
    });
    
    // In a real app, this would download a CSV/Excel file
    setTimeout(() => {
      toast({
        title: "Export Complete",
        description: "Attendance data has been exported successfully.",
      });
    }, 1500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-500 hover:bg-green-600">Present</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      case 'late':
        return <Badge className="bg-amber-500 hover:bg-amber-600">Late</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {showSearch && (
        <div className="flex justify-between items-center">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Button variant="outline" size="sm" onClick={exportAttendance}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      )}
      
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Clock In</TableHead>
              <TableHead>Clock Out</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No attendance records found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.employeeName}</TableCell>
                  <TableCell>{record.departmentName}</TableCell>
                  <TableCell>{format(new Date(record.date), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{getStatusBadge(record.status)}</TableCell>
                  <TableCell>{record.timeIn || '--:--'}</TableCell>
                  <TableCell>{record.timeOut || '--:--'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
