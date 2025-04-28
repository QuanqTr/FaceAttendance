import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Frown, X } from "lucide-react";
import { 
  RecognitionStatusType, 
  RecognizedUser 
} from "@/components/dashboard/attendance-recognition";

type RecognitionStatusProps = {
  status: RecognitionStatusType;
  recognizedUser: RecognizedUser | null;
  onRetry: () => void;
};

export function RecognitionStatus({ status, recognizedUser, onRetry }: RecognitionStatusProps) {
  return (
    <div className="bg-muted/50 rounded-lg p-4 h-full">
      <h3 className="text-md font-medium mb-3">Recognition Status</h3>
      
      {/* Waiting state */}
      <div className={cn("transition-opacity duration-300", status === 'waiting' ? "opacity-100" : "opacity-0 hidden")}>
        <div className="flex items-center mb-3">
          <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center border-2 border-muted-foreground">
            <Frown className="text-muted-foreground h-5 w-5" />
          </div>
          <div className="ml-3">
            <p className="font-medium">Waiting</p>
            <p className="text-xs text-muted-foreground">Stand in front of camera</p>
          </div>
        </div>
        
        <div className="flex justify-center">
          <div className="flex space-x-2">
            <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce delay-0"></div>
            <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce delay-300"></div>
            <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce delay-600"></div>
          </div>
        </div>
      </div>
      
      {/* Processing state */}
      <div className={cn("transition-opacity duration-300", status === 'processing' ? "opacity-100" : "opacity-0 hidden")}>
        <div className="flex items-center mb-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center border-2 border-amber-500">
            <Frown className="text-amber-500 h-5 w-5" />
          </div>
          <div className="ml-3">
            <p className="font-medium">Processing</p>
            <p className="text-xs text-amber-500">Recognizing face...</p>
          </div>
        </div>
        
        <div className="flex justify-center">
          <div className="flex space-x-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse delay-150"></div>
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse delay-300"></div>
          </div>
        </div>
      </div>
      
      {/* Success state */}
      <div className={cn("transition-opacity duration-300", status === 'success' ? "opacity-100" : "opacity-0 hidden")}>
        <div className="flex items-center mb-3">
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center border-2 border-green-500">
            <Check className="text-green-500 h-5 w-5" />
          </div>
          <div className="ml-3">
            <p className="font-medium">{recognizedUser?.name || 'User'}</p>
            <p className="text-xs text-green-500">Recognized successfully</p>
          </div>
        </div>
        
        <div className="border-t border-b py-3 my-3">
          <div className="flex justify-between mb-1">
            <span className="text-xs text-muted-foreground">ID</span>
            <span className="text-xs font-medium">{recognizedUser?.employeeId || 'Unknown'}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-xs text-muted-foreground">Department</span>
            <span className="text-xs font-medium">{recognizedUser?.department || 'Unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-muted-foreground">Time</span>
            <span className="text-xs font-medium">{recognizedUser?.time || 'Unknown'}</span>
          </div>
        </div>
        
        <div className="text-center">
          <span className="text-sm text-green-500 font-medium">Attendance recorded</span>
        </div>
      </div>
      
      {/* Error state */}
      <div className={cn("transition-opacity duration-300", status === 'error' ? "opacity-100" : "opacity-0 hidden")}>
        <div className="flex items-center mb-3">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center border-2 border-destructive">
            <X className="text-destructive h-5 w-5" />
          </div>
          <div className="ml-3">
            <p className="font-medium">Recognition Failed</p>
            <p className="text-xs text-destructive">Employee not found</p>
          </div>
        </div>
        
        <div className="text-center mt-6">
          <Button variant="default" onClick={onRetry} className="bg-primary text-white">Try Again</Button>
        </div>
      </div>
    </div>
  );
}
