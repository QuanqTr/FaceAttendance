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
import { Download, Loader2, Search, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AttendanceRecord = {
  id: number;
  employeeId: number;
  employeeName: string;
  departmentName: string;
  date: string;
  timeIn?: string;
  timeOut?: string;
  status: 'present' | 'absent' | 'late' | 'leave';
};

type AttendanceLogProps = {
  records: AttendanceRecord[];
  isLoading: boolean;
  date: Date;
  showSearch?: boolean;
};

export function AttendanceLog({ records, isLoading, date, showSearch = true }: AttendanceLogProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Get unique departments for filtering
  const departmentsSet = new Set(records?.map(record => record.departmentName) || []);
  const departments = Array.from(departmentsSet);

  const filteredRecords = records?.filter(record => {
    const nameMatch = record.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
    const departmentMatch = departmentFilter === "all" || record.departmentName === departmentFilter;
    const statusMatch = statusFilter === "all" || record.status === statusFilter;

    return nameMatch && departmentMatch && statusMatch;
  }) || [];

  const exportAttendance = () => {
    toast({
      title: t('common.exportSuccess'),
      description: t('attendance.fileDownloaded'),
    });

    // In a real app, this would download a CSV/Excel file
    setTimeout(() => {
      toast({
        title: t('common.success'),
        description: t('attendance.fileDownloaded'),
      });
    }, 1500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-500 hover:bg-green-600">{t('attendance.present')}</Badge>;
      case 'absent':
        return <Badge variant="destructive">{t('attendance.absent')}</Badge>;
      case 'late':
        return <Badge className="bg-amber-500 hover:bg-amber-600">{t('attendance.late')}</Badge>;
      case 'leave':
        return <Badge className="bg-blue-500 hover:bg-blue-600">{t('attendance.leave')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {showSearch && (
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 flex flex-col md:flex-row gap-3">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('attendance.searchEmployees')}
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center">
                <Select
                  value={departmentFilter}
                  onValueChange={setDepartmentFilter}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('employees.department')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('employees.allDepartments')}</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center">
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('common.status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('employees.allStatus')}</SelectItem>
                    <SelectItem value="present">{t('attendance.present')}</SelectItem>
                    <SelectItem value="absent">{t('attendance.absent')}</SelectItem>
                    <SelectItem value="late">{t('attendance.late')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={exportAttendance} className="shrink-0">
              <Download className="mr-2 h-4 w-4" />
              {t('attendance.export')}
            </Button>
          </div>
        </div>
      )}

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">{t('attendance.employee')}</TableHead>
              <TableHead>{t('employees.department')}</TableHead>
              <TableHead>{t('attendance.date')}</TableHead>
              <TableHead>{t('attendance.status')}</TableHead>
              <TableHead>{t('attendance.clockIn')}</TableHead>
              <TableHead>{t('attendance.clockOut')}</TableHead>
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
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Calendar className="h-10 w-10 mb-2" />
                    <p className="mb-1 font-medium">{t('attendance.noAttendanceRecordsFound')}</p>
                    <p className="text-sm">{t('attendance.noAttendanceRecordsForDay')}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.employeeName}</TableCell>
                  <TableCell>{record.departmentName}</TableCell>
                  <TableCell>{format(new Date(record.date), 'dd/MM/yyyy')}</TableCell>
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
