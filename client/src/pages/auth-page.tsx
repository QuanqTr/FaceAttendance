import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { User, KeyRound, Mail, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function AuthPage() {
  const { toast } = useToast();
  const { user, loginMutation } = useAuth();
  const { t } = useTranslation();
  const [_, navigate] = useLocation();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Login form schema with translations
  const loginSchema = z.object({
    username: z.string().min(1, t('auth.username') + " " + t('common.required')),
    password: z.string().min(1, t('auth.password') + " " + t('common.required')),
  });

  // Login form
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      console.log("AuthPage: User already logged in, redirecting to dashboard");
      // Always redirect to role-specific dashboard
      let dashboardUrl = '/';
      if (user.role === 'employee') {
        dashboardUrl = '/user';
      } else if (user.role === 'manager') {
        dashboardUrl = '/manager';
      } else if (user.role === 'admin') {
        dashboardUrl = '/';
      }
      navigate(dashboardUrl);
    }
  }, [user, navigate]);

  const onLoginSubmit = (values: z.infer<typeof loginSchema>) => {
    console.log("AuthPage: Submitting login form");
    loginMutation.mutate(values);
  };

  // Handle forgot password
  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập địa chỉ email",
        variant: "destructive",
      });
      return;
    }

    setIsResettingPassword(true);
    try {
      const response = await apiRequest("POST", "/api/forgot-password", {
        email: forgotPasswordEmail.trim()
      });

      if (response.ok) {
        toast({
          title: "✅ Gửi email thành công",
          description: "Mật khẩu mới đã được gửi về email của bạn. Vui lòng kiểm tra hộp thư đến.",
          duration: 5000,
        });
        setShowForgotPassword(false);
        setForgotPasswordEmail("");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Không thể gửi email reset password");
      }
    } catch (error: any) {
      toast({
        title: "Lỗi reset password",
        description: error.message || "Đã xảy ra lỗi khi gửi email reset password",
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      <div className="flex flex-col md:flex-row w-full">
        {/* Hero Section - Now on the left */}
        <div className="hidden md:flex md:w-1/2 bg-primary items-center justify-center">
          <div className="max-w-md text-white p-8">
            <div className="flex items-center mb-6">
              <User className="h-12 w-12 mr-4" />
              <h1 className="text-3xl font-bold">FaceAttend</h1>
            </div>
            <h2 className="text-2xl font-bold mb-4">{t('auth.appTitle')}</h2>
            <p className="mb-6">
              {t('auth.appDescription')}
            </p>
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="bg-white/20 p-2 rounded-full mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>{t('auth.feature1')}</span>
              </div>
              <div className="flex items-center">
                <div className="bg-white/20 p-2 rounded-full mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>{t('auth.feature2')}</span>
              </div>
              <div className="flex items-center">
                <div className="bg-white/20 p-2 rounded-full mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>{t('auth.feature3')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Section - Now on the right */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-4 md:p-8">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">
                {t('auth.login')} - FaceAttend
              </CardTitle>
              <CardDescription>
                {t('auth.loginDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.username')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('auth.enterUsername')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.password')}</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder={t('auth.enterPassword')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('auth.signingIn')}
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <KeyRound className="mr-2 h-4 w-4" />
                        {t('auth.loginButton')}
                      </span>
                    )}
                  </Button>

                  {/* Forgot Password */}
                  <div className="text-center">
                    <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
                      <DialogTrigger asChild>
                        <Button
                          variant="link"
                          className="text-sm text-muted-foreground hover:text-primary"
                          type="button"
                        >
                          Quên mật khẩu?
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            Quên mật khẩu
                          </DialogTitle>
                          <DialogDescription>
                            Nhập email của bạn để nhận mật khẩu mới
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">
                              Email
                            </label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="Nhập email của bạn"
                              value={forgotPasswordEmail}
                              onChange={(e) => setForgotPasswordEmail(e.target.value)}
                              disabled={isResettingPassword}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleForgotPassword();
                                }
                              }}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setShowForgotPassword(false)}
                              disabled={isResettingPassword}
                            >
                              Hủy
                            </Button>
                            <Button
                              onClick={handleForgotPassword}
                              disabled={isResettingPassword || !forgotPasswordEmail.trim()}
                            >
                              {isResettingPassword ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Đang gửi...
                                </>
                              ) : (
                                <>
                                  <Mail className="mr-2 h-4 w-4" />
                                  Gửi email
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
