import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Shield, Timer, CheckCircle, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ManagerEmailVerificationProps {
    employeeId: number;
    employeeEmail: string;
    onVerificationSuccess: (token: string) => void;
    onCancel: () => void;
}

export const ManagerEmailVerification: React.FC<ManagerEmailVerificationProps> = ({
    employeeId,
    employeeEmail,
    onVerificationSuccess,
    onCancel,
}) => {
    const [step, setStep] = useState<'request' | 'verify'>('request');
    const [otpCode, setOtpCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [timeLeft, setTimeLeft] = useState(0);
    const [maskedEmail, setMaskedEmail] = useState('');
    const [remainingAttempts, setRemainingAttempts] = useState(3);
    const { toast } = useToast();

    // Timer cho countdown
    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setTimeout(() => {
                setTimeLeft(timeLeft - 1);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [timeLeft]);

    // Gửi mã OTP cho manager
    const handleSendOTP = async () => {
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('/api/manager/face-profile/send-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    employeeId: employeeId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Không thể gửi mã xác thực');
            }

            console.log('Manager OTP sent successfully:', data);
            setMaskedEmail(data.email);
            setTimeLeft(data.expiresIn || 600); // 10 phút
            setStep('verify');
            setRemainingAttempts(3);

            toast({
                title: '✅ Đã gửi mã xác thực',
                description: `Mã xác thực Manager đã được gửi đến ${data.email}`,
            });

        } catch (error) {
            console.error('Error sending manager OTP:', error);
            setError(error instanceof Error ? error.message : 'Có lỗi xảy ra khi gửi mã xác thực');
        } finally {
            setIsLoading(false);
        }
    };

    // Xác thực mã OTP cho manager
    const handleVerifyOTP = async () => {
        if (!otpCode || otpCode.length !== 6) {
            setError('Vui lòng nhập đầy đủ 6 chữ số');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('/api/manager/face-profile/verify-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    employeeId: employeeId,
                    otpCode: otpCode,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.code === 'INVALID_OTP') {
                    setRemainingAttempts(data.remainingAttempts || 0);
                }
                throw new Error(data.error || 'Mã xác thực không đúng');
            }

            console.log('Manager OTP verified successfully:', data);

            toast({
                title: '✅ Xác thực Manager thành công',
                description: 'Bạn có thể cập nhật dữ liệu khuôn mặt',
            });

            // Gọi callback với access token
            onVerificationSuccess(data.accessToken);

        } catch (error) {
            console.error('Error verifying manager OTP:', error);
            setError(error instanceof Error ? error.message : 'Có lỗi xảy ra khi xác thực');
        } finally {
            setIsLoading(false);
        }
    };

    // Format thời gian còn lại
    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Gửi lại mã
    const handleResendOTP = () => {
        setStep('request');
        setOtpCode('');
        setError('');
        setTimeLeft(0);
    };

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl font-semibold">
                    Xác thực Email Manager
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    Để bảo mật thông tin khuôn mặt Manager, vui lòng xác thực email
                </p>
            </CardHeader>

            <CardContent className="space-y-4">
                {step === 'request' ? (
                    // Bước 1: Yêu cầu gửi mã
                    <>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email Manager nhận mã xác thực</label>
                            <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">{employeeEmail}</span>
                            </div>
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Button
                                onClick={handleSendOTP}
                                disabled={isLoading}
                                className="w-full"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Đang gửi...
                                    </>
                                ) : (
                                    <>
                                        <Mail className="mr-2 h-4 w-4" />
                                        Gửi mã xác thực Manager
                                    </>
                                )}
                            </Button>

                            <Button
                                variant="outline"
                                onClick={onCancel}
                                className="w-full"
                            >
                                Hủy
                            </Button>
                        </div>
                    </>
                ) : (
                    // Bước 2: Nhập mã xác thực
                    <>
                        <div className="text-center space-y-2">
                            <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                            <p className="text-sm text-muted-foreground">
                                Mã xác thực Manager đã được gửi đến
                            </p>
                            <p className="text-sm font-medium">{maskedEmail}</p>
                        </div>

                        {timeLeft > 0 && (
                            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                                <Timer className="w-4 h-4" />
                                <span>Mã hết hạn sau: {formatTime(timeLeft)}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nhập mã xác thực Manager (6 chữ số)</label>
                            <Input
                                type="text"
                                value={otpCode}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                    setOtpCode(value);
                                    setError('');
                                }}
                                placeholder="000000"
                                className="text-center text-lg tracking-widest"
                                maxLength={6}
                            />
                            {remainingAttempts < 3 && (
                                <p className="text-xs text-orange-600">
                                    Còn {remainingAttempts} lần thử
                                </p>
                            )}
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Button
                                onClick={handleVerifyOTP}
                                disabled={isLoading || otpCode.length !== 6}
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
                                        Xác thực Manager
                                    </>
                                )}
                            </Button>

                            <div className="flex space-x-2">
                                <Button
                                    variant="outline"
                                    onClick={handleResendOTP}
                                    disabled={timeLeft > 0}
                                    className="flex-1"
                                >
                                    {timeLeft > 0 ? `Gửi lại (${formatTime(timeLeft)})` : 'Gửi lại mã'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={onCancel}
                                    className="flex-1"
                                >
                                    Hủy
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}; 