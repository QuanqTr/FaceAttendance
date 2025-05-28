import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, Shield, X, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EmailVerificationProps {
    employeeId: number;
    employeeEmail: string;
    onVerificationSuccess: (token: string) => void;
    onCancel: () => void;
}

export function EmailVerification({
    employeeId,
    employeeEmail,
    onVerificationSuccess,
    onCancel
}: EmailVerificationProps) {
    const { toast } = useToast();
    const [step, setStep] = useState<'email' | 'verification'>('email');
    const [email, setEmail] = useState(employeeEmail || '');
    const [verificationCode, setVerificationCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [canResend, setCanResend] = useState(true);

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Countdown timer for resend
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        } else if (countdown === 0 && !canResend) {
            setCanResend(true);
        }
        return () => clearTimeout(timer);
    }, [countdown, canResend]);

    // Auto-focus and move to next input
    const handleCodeInput = (index: number, value: string) => {
        if (value.length > 1) {
            value = value.slice(-1);
        }

        const newCode = verificationCode.split('');
        newCode[index] = value;
        const updatedCode = newCode.join('');
        setVerificationCode(updatedCode);

        // Move to next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit if all 6 digits are entered
        if (updatedCode.length === 6 && !updatedCode.includes('')) {
            handleVerifyCode(updatedCode);
        }
    };

    // Handle backspace
    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    // Send verification email
    const handleSendVerification = async () => {
        if (!email.trim()) {
            toast({
                title: "Email không hợp lệ",
                description: "Vui lòng nhập địa chỉ email",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const response = await apiRequest("POST", "/api/face-auth/send-verification", {
                email: email.trim(),
                employeeId: employeeId
            });

            if (response.ok) {
                toast({
                    title: "✅ Gửi mã thành công",
                    description: "Mã xác thực đã được gửi về email của bạn",
                    duration: 3000,
                });
                setStep('verification');
                setCountdown(60);
                setCanResend(false);

                // Focus first input
                setTimeout(() => {
                    inputRefs.current[0]?.focus();
                }, 100);
            }
        } catch (error: any) {
            toast({
                title: "Lỗi gửi mã xác thực",
                description: error.message || "Đã xảy ra lỗi khi gửi mã xác thực",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Verify code
    const handleVerifyCode = async (code?: string) => {
        const codeToVerify = code || verificationCode;

        if (codeToVerify.length !== 6) {
            toast({
                title: "Mã không hợp lệ",
                description: "Vui lòng nhập đầy đủ 6 chữ số",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const response = await apiRequest("POST", "/api/face-auth/verify-code", {
                email: email.trim(),
                code: codeToVerify,
                employeeId: employeeId
            });

            if (response.ok) {
                const data = response.data;
                toast({
                    title: "✅ Xác thực thành công",
                    description: "Bạn đã được cấp quyền truy cập",
                    duration: 3000,
                });
                onVerificationSuccess(data.accessToken);
            }
        } catch (error: any) {
            toast({
                title: "Xác thực thất bại",
                description: error.message || "Mã xác thực không đúng hoặc đã hết hạn",
                variant: "destructive",
            });

            // Clear wrong code
            setVerificationCode('');
            inputRefs.current[0]?.focus();
        } finally {
            setIsLoading(false);
        }
    };

    // Resend code
    const handleResendCode = () => {
        if (canResend) {
            setVerificationCode('');
            handleSendVerification();
        }
    };

    return (
        <Card className="w-full max-w-md mx-auto shadow-lg">
            <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                    {step === 'email' ? (
                        <Mail className="w-6 h-6 text-blue-600" />
                    ) : (
                        <Shield className="w-6 h-6 text-blue-600" />
                    )}
                </div>
                <CardTitle className="text-xl font-semibold">
                    {step === 'email' ? '🔐 Xác thực Email' : '📧 Nhập mã xác thực'}
                </CardTitle>
                <CardDescription className="text-sm">
                    {step === 'email'
                        ? 'Vui lòng nhập email để nhận mã xác thực'
                        : `Mã xác thực đã được gửi về ${email}`
                    }
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {step === 'email' ? (
                    <>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Địa chỉ Email</label>
                            <Input
                                type="email"
                                placeholder="example@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                className="w-full"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSendVerification();
                                    }
                                }}
                            />
                        </div>

                        <div className="flex space-x-2">
                            <Button
                                onClick={handleSendVerification}
                                disabled={isLoading || !email.trim()}
                                className="flex-1"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Đang gửi...
                                    </>
                                ) : (
                                    <>
                                        <Mail className="mr-2 h-4 w-4" />
                                        Gửi mã xác thực
                                    </>
                                )}
                            </Button>

                            <Button
                                variant="outline"
                                onClick={onCancel}
                                disabled={isLoading}
                                className="px-3"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium">Mã xác thực (6 chữ số)</label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setStep('email')}
                                    className="text-xs px-2 py-1 h-auto"
                                >
                                    <ArrowLeft className="mr-1 h-3 w-3" />
                                    Đổi email
                                </Button>
                            </div>

                            <div className="flex space-x-2 justify-center">
                                {[0, 1, 2, 3, 4, 5].map((index) => (
                                    <Input
                                        key={index}
                                        ref={(el) => (inputRefs.current[index] = el)}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={verificationCode[index] || ''}
                                        onChange={(e) => handleCodeInput(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        disabled={isLoading}
                                        className="w-12 h-12 text-center text-lg font-semibold border-2 focus:border-blue-500"
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Button
                                onClick={() => handleVerifyCode()}
                                disabled={isLoading || verificationCode.length !== 6}
                                className="w-full"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Đang xác thực...
                                    </>
                                ) : (
                                    <>
                                        <Shield className="mr-2 h-4 w-4" />
                                        Xác thực
                                    </>
                                )}
                            </Button>

                            <div className="text-center">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleResendCode}
                                    disabled={!canResend || isLoading}
                                    className="text-sm"
                                >
                                    {canResend ? (
                                        "🔄 Gửi lại mã"
                                    ) : (
                                        `Gửi lại sau ${countdown}s`
                                    )}
                                </Button>
                            </div>

                            <div className="flex space-x-2">
                                <Button
                                    variant="outline"
                                    onClick={onCancel}
                                    disabled={isLoading}
                                    className="flex-1"
                                >
                                    Hủy
                                </Button>
                            </div>
                        </div>
                    </>
                )}

                {/* Info box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
                    <p className="text-blue-700 mb-1">
                        <strong>📌 Lưu ý:</strong>
                    </p>
                    <ul className="text-blue-600 space-y-1 list-disc list-inside">
                        <li>Mã xác thực có hiệu lực trong 5 phút</li>
                        <li>Chỉ admin được phép truy cập chức năng này</li>
                        <li>Kiểm tra hộp thư spam nếu không thấy email</li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
} 