import { useLanguage } from "@/hooks/use-language";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface Language {
    code: string;
    label: string;
    flag: string;
    nativeName: string;
}

export function LanguageSwitcher() {
    const { t } = useTranslation();
    const { currentLanguage, changeLanguage } = useLanguage();

    const languages: Language[] = [
        {
            code: "en",
            label: t("settings.english"),
            flag: "🇺🇸",
            nativeName: "English"
        },
        {
            code: "vi",
            label: t("settings.vietnamese"),
            flag: "🇻🇳",
            nativeName: "Tiếng Việt"
        },
    ];

    const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 px-3 h-9 rounded-md border"
                >
                    <span className="text-base">{currentLang.flag}</span>
                    <span className="hidden md:inline">{currentLang.nativeName}</span>
                    <span className="md:hidden">{currentLang.code.toUpperCase()}</span>
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuLabel>{t('settings.selectLanguage')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {languages.map((language) => (
                    <DropdownMenuItem
                        key={language.code}
                        className={cn(
                            "flex items-center gap-3 cursor-pointer",
                            currentLanguage === language.code && "bg-accent font-medium"
                        )}
                        onClick={() => changeLanguage(language.code)}
                    >
                        <span className="text-lg">{language.flag}</span>
                        <div className="flex flex-col">
                            <span>{language.label}</span>
                            <span className="text-xs text-muted-foreground">
                                {language.nativeName}
                            </span>
                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}