import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Girando } from "@/components/comun";
import { Marco } from "@/pages/Acceso";
import { useAuth } from "@/lib/auth";

export default function IngresarProveedor() {
  const { ingresar } = useAuth();
  const navegar = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e?: FormEvent, prueba?: boolean) => {
    e?.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await ingresar(prueba ? "andina@nexora.pe" : email, prueba ? "proveedor123" : password);
      navegar("/proveedor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos iniciar sesión.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Marco
      imagen="/img/proveedor/hero.webp"
      rol="PROVEEDOR"
      insignia="Portal del proveedor"
      puntos={["Recibe pedidos ya agrupados por zona", "Confirma solo lo que puedes cumplir", "Coordina la entrega con cada negocio"]}
      titulo="Inicia sesión"
      subtitulo="Revisa tus compras en grupo, confirma precio y entrega, y atiende a tus clientes."
      lema="Vende por volumen a las bodegas de cada zona."
      texto="NEXORA reúne los pedidos de varias bodegas. Tú confirmas stock, precio final y fecha de entrega."
    >
      <form onSubmit={enviar} className="space-y-4" noValidate>
        {error && <Alert variant="destructive">{error}</Alert>}
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ventas@tuempresa.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={enviando || !email || !password}>
          {enviando ? <Girando /> : <ArrowRight />} Ingresar
        </Button>
        <Button type="button" variant="outline" size="lg" className="h-auto min-h-12 w-full whitespace-normal py-2" disabled={enviando} onClick={() => enviar(undefined, true)}>
          <Sparkles /> Entrar con datos de prueba (Distribuidora Andina)
        </Button>
      </form>
    </Marco>
  );
}
