import { useLanguage } from "@/hooks/use-language";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
    const { t } = useTranslation();
    const { currentLanguage, changeLanguage } = useLanguage();

    const languages = [
        { code: "en", label: t("settings.english") },
        { code: "vi", label: t("settings.vietnamese") },
    ];

    const currentLanguageLabel = languages.find(lang => lang.code === currentLanguage)?.label || languages[0].label;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    <span className="hidden md:inline">{currentLanguageLabel}</span>
                    <span className="md:hidden">{currentLanguage.toUpperCase()}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {languages.map((language) => (
                    <DropdownMenuItem
                        key={language.code}
                        className={currentLanguage === language.code ? "bg-accent" : ""}
                        onClick={() => changeLanguage(language.code)}
                    >
                        {language.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}