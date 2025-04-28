import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Download, FilePlus2, FileSpreadsheet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type ReportGeneratorProps = {
  startDate: Date;
  endDate: Date;
  reportType: string;
  setReportType: (type: string) => void;
};

export function ReportGenerator({ startDate, endDate, reportType, setReportType }: ReportGeneratorProps) {
  const { toast } = useToast();
  const [fileFormat, setFileFormat] = useState("csv");
  const [isGenerating, setIsGenerating] = useState(false);
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to?: Date;
  }>({
    from: startDate,
    to: endDate,
  });

  const generateReport = () => {
    setIsGenerating(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsGenerating(false);
      toast({
        title: "Report Generated",
        description: `Your ${reportType} report has been generated successfully.`,
      });
    }, 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Reports</CardTitle>
        <CardDescription>
          Create and download attendance and employee reports
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label>Report Type</Label>
            <RadioGroup 
              defaultValue={reportType} 
              value={reportType}
              onValueChange={setReportType}
              className="flex flex-col space-y-2 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="attendance" id="attendance" />
                <Label htmlFor="attendance" className="cursor-pointer">Attendance Report</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="employee" id="employee" />
                <Label htmlFor="employee" className="cursor-pointer">Employee Report</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="department" id="department" />
                <Label htmlFor="department" className="cursor-pointer">Department Report</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="summary" id="summary" />
                <Label htmlFor="summary" className="cursor-pointer">Summary Report</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="grid gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select defaultValue="all">
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="1">IT Department</SelectItem>
                  <SelectItem value="2">Marketing</SelectItem>
                  <SelectItem value="3">Human Resources</SelectItem>
                  <SelectItem value="4">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>File Format</Label>
            <div className="flex flex-wrap gap-3 mt-2">
              <div
                className={cn(
                  "flex items-center p-3 border rounded-md cursor-pointer",
                  fileFormat === "csv" ? "border-primary bg-primary/10" : "border-input"
                )}
                onClick={() => setFileFormat("csv")}
              >
                <FileSpreadsheet className="h-5 w-5 mr-2 text-primary" />
                <span>CSV</span>
              </div>
              
              <div
                className={cn(
                  "flex items-center p-3 border rounded-md cursor-pointer",
                  fileFormat === "xlsx" ? "border-primary bg-primary/10" : "border-input"
                )}
                onClick={() => setFileFormat("xlsx")}
              >
                <FileSpreadsheet className="h-5 w-5 mr-2 text-green-600" />
                <span>Excel (XLSX)</span>
              </div>
              
              <div
                className={cn(
                  "flex items-center p-3 border rounded-md cursor-pointer",
                  fileFormat === "pdf" ? "border-primary bg-primary/10" : "border-input"
                )}
                onClick={() => setFileFormat("pdf")}
              >
                <FileText className="h-5 w-5 mr-2 text-red-600" />
                <span>PDF</span>
              </div>
            </div>
          </div>
          
          {reportType === "attendance" && (
            <div className="space-y-2">
              <Label>Include Details</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="clockIn" className="rounded" defaultChecked />
                  <Label htmlFor="clockIn" className="cursor-pointer">Clock In/Out Times</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="status" className="rounded" defaultChecked />
                  <Label htmlFor="status" className="cursor-pointer">Attendance Status</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="department" className="rounded" defaultChecked />
                  <Label htmlFor="department" className="cursor-pointer">Department Info</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="summary" className="rounded" defaultChecked />
                  <Label htmlFor="summary" className="cursor-pointer">Summary Statistics</Label>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={generateReport}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Report...
            </span>
          ) : (
            <span className="flex items-center">
              <Download className="mr-2 h-4 w-4" />
              Generate and Download Report
            </span>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
