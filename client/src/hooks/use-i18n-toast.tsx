import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

/**
 * A wrapper hook for useToast that adds i18n support.
 * Use this hook to show toast messages with translations.
 */
export function useI18nToast() {
    const { toast } = useToast();
    const { t } = useTranslation();

    return {
        /**
         * Show a success toast with translated message
         */
        success: (titleKey: string = 'common.success', descriptionKey?: string, vars?: Record<string, any>) => {
            return toast({
                title: t(titleKey, vars),
                description: descriptionKey ? t(descriptionKey, vars) : undefined,
                variant: 'success',
            });
        },

        /**
         * Show an error toast with translated message
         */
        error: (titleKey: string = 'common.error', descriptionKey?: string, vars?: Record<string, any>) => {
            return toast({
                title: t(titleKey, vars),
                description: descriptionKey ? t(descriptionKey, vars) : undefined,
                variant: 'destructive',
            });
        },

        /**
         * Show a warning toast with translated message
         */
        warning: (titleKey: string = 'common.warning', descriptionKey?: string, vars?: Record<string, any>) => {
            return toast({
                title: t(titleKey, vars),
                description: descriptionKey ? t(descriptionKey, vars) : undefined,
                variant: 'default',
            });
        },

        /**
         * Show an info toast with translated message
         */
        info: (titleKey: string = 'common.info', descriptionKey?: string, vars?: Record<string, any>) => {
            return toast({
                title: t(titleKey, vars),
                description: descriptionKey ? t(descriptionKey, vars) : undefined,
                variant: 'default',
            });
        },

        /**
         * Show a custom toast with translated message
         */
        custom: (options: {
            titleKey: string;
            descriptionKey?: string;
            variant?: 'default' | 'destructive' | 'success';
            vars?: Record<string, any>;
        }) => {
            const { titleKey, descriptionKey, variant = 'default', vars } = options;

            return toast({
                title: t(titleKey, vars),
                description: descriptionKey ? t(descriptionKey, vars) : undefined,
                variant,
            });
        },
    };
} 