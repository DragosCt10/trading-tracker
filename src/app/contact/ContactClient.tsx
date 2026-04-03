'use client';

import { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { PricingHeroBackground } from '@/components/pricing/PricingHeroBackground';
import { Footer } from '@/components/shared/Footer';

const SUBJECTS = [
  'General Inquiry',
  'Bug Report',
  'Feature Request',
  'Billing',
  'Partnership',
] as const;

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

interface FieldErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

export function ContactClient() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState('');

  function validateClient(): FieldErrors {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = 'Name is required';
    if (!email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Please enter a valid email';
    if (!subject) errors.subject = 'Please select a subject';
    if (!message.trim()) errors.message = 'Message is required';
    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errors = validateClient();
    setFieldErrors(errors);
    setGeneralError('');
    if (Object.keys(errors).length > 0) return;

    setStatus('loading');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject,
          message: message.trim(),
          website: (document.getElementById('website') as HTMLInputElement)?.value || '',
        }),
      });

      if (res.status === 429) {
        setGeneralError('Please wait before sending another message.');
        setStatus('error');
        return;
      }

      if (res.status === 400) {
        const data = await res.json();
        if (data.errors) {
          setFieldErrors(data.errors);
        } else {
          setGeneralError(data.error || 'Please check your input and try again.');
        }
        setStatus('error');
        return;
      }

      setStatus('success');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      setFieldErrors({});
    } catch {
      setGeneralError('Something went wrong. Please try again later.');
      setStatus('error');
    }
  }

  return (
    <div className="landing-page-override w-full">
      <LandingHeader />

      <section className="relative overflow-clip">
        <PricingHeroBackground />

        <main className="relative mx-auto max-w-2xl px-4 sm:px-6 pt-32 sm:pt-40 pb-16 sm:pb-24">
          {/* Hero */}
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em] text-white">
              Get in touch
            </h1>
            <p className="mt-3 text-muted-foreground">
              Have a question, found a bug, or want to partner up? We&apos;d love to hear from you.
            </p>
          </div>

          {/* Form card */}
          <div
            className="rounded-2xl border border-white/10 p-6 sm:p-8"
            style={{
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            {status === 'success' ? (
              <div className="flex flex-col items-center py-8 text-center gap-4">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))',
                    border: '1px solid rgba(16,185,129,0.3)',
                  }}
                >
                  <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Message sent!</h2>
                <p className="text-muted-foreground max-w-sm">
                  Thanks for reaching out. We&apos;ll reply to your email as soon as possible.
                </p>
                <Button
                  variant="outline"
                  className="mt-2 cursor-pointer rounded-lg"
                  onClick={() => setStatus('idle')}
                >
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* Honeypot — hidden from humans */}
                <div className="absolute opacity-0 h-0 w-0 overflow-hidden" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input
                    type="text"
                    id="website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                {/* Name + Email row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm text-slate-300">
                      Name <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setFieldErrors((p) => ({ ...p, name: undefined })); }}
                      maxLength={100}
                      placeholder="Your name"
                      className={fieldErrors.name
                        ? 'border-red-500/60 focus:ring-red-500/40'
                        : 'border-white/10 bg-white/5 focus:border-white/20'
                      }
                    />
                    {fieldErrors.name && (
                      <p className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {fieldErrors.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm text-slate-300">
                      Email <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: undefined })); }}
                      maxLength={254}
                      placeholder="you@example.com"
                      className={fieldErrors.email
                        ? 'border-red-500/60 focus:ring-red-500/40'
                        : 'border-white/10 bg-white/5 focus:border-white/20'
                      }
                    />
                    {fieldErrors.email && (
                      <p className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {fieldErrors.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-sm text-slate-300">
                    Subject <span className="text-red-400">*</span>
                  </Label>
                  <Select
                    value={subject}
                    onValueChange={(v) => { setSubject(v); setFieldErrors((p) => ({ ...p, subject: undefined })); }}
                  >
                    <SelectTrigger
                      id="subject"
                      className={fieldErrors.subject
                        ? 'border-red-500/60 focus:ring-red-500/40'
                        : 'border-white/10 bg-white/5 focus:border-white/20'
                      }
                    >
                      <SelectValue placeholder="Select a topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.subject && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {fieldErrors.subject}
                    </p>
                  )}
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-sm text-slate-300">
                    Message <span className="text-red-400">*</span>
                  </Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => { setMessage(e.target.value); setFieldErrors((p) => ({ ...p, message: undefined })); }}
                    maxLength={5000}
                    rows={5}
                    placeholder="Tell us what's on your mind..."
                    className={fieldErrors.message
                      ? 'border-red-500/60 focus:ring-red-500/40'
                      : 'border-white/10 bg-white/5 focus:border-white/20'
                    }
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    {fieldErrors.message ? (
                      <p className="text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {fieldErrors.message}
                      </p>
                    ) : <span />}
                    <span>{message.length}/5000</span>
                  </div>
                </div>

                {/* General error */}
                {generalError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {generalError}
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={status === 'loading'}
                  className="relative w-full cursor-pointer overflow-hidden rounded-lg text-white font-semibold border-0 shadow-lg hover:shadow-xl transition-all duration-300 group h-11"
                  style={{
                    background:
                      'linear-gradient(to right, var(--tc-primary), var(--tc-accent), var(--tc-accent-end))',
                    boxShadow:
                      '0 10px 15px -3px color-mix(in oklab, var(--tc-primary) 30%, transparent), 0 4px 6px -4px color-mix(in oklab, var(--tc-primary) 20%, transparent)',
                  }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {status === 'loading' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send message
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
                </Button>
              </form>
            )}
          </div>
        </main>

        <div className="relative [&>footer]:bg-transparent [&>footer]:border-0 [&>footer]:mt-0">
          <Footer />
        </div>
      </section>
    </div>
  );
}
