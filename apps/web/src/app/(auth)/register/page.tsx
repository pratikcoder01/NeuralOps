"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRegister } from "@/lib/hooks/useAuth";
import toast from "react-hot-toast";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  workspaceName: z.string().min(2, "Workspace name is required"),
  password: z.string().min(8, "Must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { mutate: register, isPending } = useRegister();

  const { register: reg, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    register(
      { name: data.name, email: data.email, password: data.password, workspaceName: data.workspaceName },
      {
        onSuccess: () => {
          toast.success("Workspace created! Welcome to NeuralOps.");
          router.push("/dashboard");
        },
        onError: (err: unknown) => {
          toast.error(err instanceof Error ? err.message : "Registration failed");
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 right-1/3 h-64 w-64 rounded-full bg-violet-500/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-lg">NeuralOps</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-xl">
          <h1 className="text-lg font-bold mb-1">Create your workspace</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">Sign in</Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Full Name</label>
              <Input {...reg("name")} placeholder="Jane Smith" />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Work Email</label>
              <Input {...reg("email")} type="email" placeholder="jane@company.com" />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                <Building2 className="inline h-3 w-3 mr-1" /> Workspace Name
              </label>
              <Input {...reg("workspaceName")} placeholder="Acme Corp SRE" />
              {errors.workspaceName && <p className="text-xs text-destructive mt-1">{errors.workspaceName.message}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Password</label>
              <Input {...reg("password")} type="password" placeholder="••••••••" />
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Confirm Password</label>
              <Input {...reg("confirmPassword")} type="password" placeholder="••••••••" />
              {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <Button type="submit" className="w-full mt-2" isLoading={isPending}>
              {isPending ? "Creating workspace…" : "Create Workspace"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            By creating an account you agree to our{" "}
            <a href="#" className="text-primary hover:underline">Terms</a> and{" "}
            <a href="#" className="text-primary hover:underline">Privacy Policy</a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
