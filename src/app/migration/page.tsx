
"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  DatabaseZap,
  Settings,
  Upload,
  Loader2,
  CheckCircle,
  AlertTriangle,
  FileJson,
  ClipboardPaste,
  Eye,
  LogOut,
  Table,
  ShoppingBag,
} from "lucide-react";
import { collection, doc, setDoc, getDocs, writeBatch } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { handleInferSchemaAction } from "../actions";
import { database, auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";


type MigrationStatus = "idle" | "inProgress" | "completed" | "error";

export default function MigrationPage() {
  const [user, setUser] = useState<User | null>(null);
  const [jsonInput, setJsonInput] = useState(`{
  "id": "bQ2obl6WwM5MuXo6wiB1",
  "type": "table",
  "name": "rb_penjualan_eceran",
  "data": [
    {
      "id_penjualan_eceran": "1",
      "no_ref": "251",
      "id_dokter": "0",
      "status": "lunas",
      "total_bayar": "450000",
      "nama_karyawan": "Chusnul Chuluq Nugraha",
      "tgl_pesan": "09/11/2021",
      "no_telp": "",
      "sisa_bayar": "0",
      "total_jual": "450000",
      "nama_pemesan": "YOSI",
      "total_modal": "135000",
      "no_orders": "E0000001",
      "id_instansi": "0"
    }
  ]
}`);
  const [inferredSchema, setInferredSchema] = useState("");
  const [editedSchema, setEditedSchema] = useState("");
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);
  const [migrationStatus, setMigrationStatus] =
    useState<MigrationStatus>("idle");
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [firebaseData, setFirebaseData] = useState<string | null>(null);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (inferredSchema) {
      setEditedSchema(inferredSchema);
    }
  }, [inferredSchema]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== "application/json") {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload a valid .json file.",
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setJsonInput(text);
        try {
          // pre-format the json
          const parsed = JSON.parse(text);
          setJsonInput(JSON.stringify(parsed, null, 2));
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Invalid JSON",
            description: "The uploaded file contains invalid JSON.",
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleInferSchema = async () => {
    if (!jsonInput.trim()) {
      toast({
        variant: "destructive",
        title: "Input Required",
        description: "Please provide JSON data before inferring a schema.",
      });
      return;
    }
    setIsLoadingSchema(true);
    setInferredSchema("");
    setEditedSchema("");

    const result = await handleInferSchemaAction(jsonInput);
    
    if (result.error) {
      toast({
        variant: "destructive",
        title: "Schema Inference Failed",
        description: result.error,
      });
    } else if (result.schema) {
      setInferredSchema(result.schema);
      toast({
        title: "Schema Inferred",
        description: "The database schema has been successfully inferred.",
      });
    }
    setIsLoadingSchema(false);
  };

  const handleMigrate = async () => {
    if (!jsonInput.trim()) {
      toast({
        variant: "destructive",
        title: "JSON Data Required",
        description: "Please provide JSON data before migrating.",
      });
      return;
    }
    setMigrationStatus("inProgress");
    setMigrationProgress(0);
    setErrorMessage("");

    try {
      let parsedJson = JSON.parse(jsonInput);
      
      const collectionName = parsedJson.name || "migrated_data";
      let dataToMigrate;

      if (typeof parsedJson === 'object' && !Array.isArray(parsedJson) && Array.isArray(parsedJson.data)) {
        dataToMigrate = parsedJson.data;
      } else if (Array.isArray(parsedJson)) {
        dataToMigrate = parsedJson;
      } else {
        throw new Error("JSON data must be an array of objects, or an object with a 'data' array property.");
      }

      setMigrationProgress(25);
      
      const docRef = doc(database, "migrated_data", parsedJson.id || collectionName);
      
      await setDoc(docRef, { data: dataToMigrate });
      
      setMigrationProgress(100);
      setMigrationStatus("completed");
      toast({
        title: "Migration Successful",
        description: `Your data has been successfully migrated to document '${docRef.id}' in 'migrated_data' collection.`,
      });
    } catch (error: any) {
      setMigrationStatus("error");
      const friendlyMessage = error.code === 'permission-denied'
        ? "Permission denied. Please check your Firestore security rules to allow writes."
        : `An unexpected error occurred: ${error.message}`;
      setErrorMessage(friendlyMessage);
      toast({
        variant: "destructive",
        title: "Migration Failed",
        description: friendlyMessage,
      });
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const previewData = useMemo(() => {
    if (!jsonInput) return " ";
    try {
      let parsed = JSON.parse(jsonInput);
      if (parsed.data && Array.isArray(parsed.data)) {
        parsed = parsed.data;
      }
      return JSON.stringify(parsed, null, 2);
    } catch {
      return "Invalid JSON format. Cannot generate preview.";
    }
  }, [jsonInput]);

  const migrationStatusContent = useMemo(() => {
    switch (migrationStatus) {
      case "inProgress":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Migrating data to Firestore...</p>
            <Progress value={migrationProgress} className="w-full" />
            <p className="text-right text-sm font-mono">{Math.round(migrationProgress)}%</p>
          </div>
        );
      case "completed":
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <p className="font-medium">Migration Complete!</p>
          </div>
        );
      case "error":
        return (
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <p className="font-medium">Migration Failed</p>
            {errorMessage && <p className="text-xs">{errorMessage}</p>}
          </div>
        );
      default:
        return null;
    }
  }, [migrationStatus, migrationProgress, errorMessage]);

  const resetFlow = () => {
    setJsonInput("");
    setInferredSchema("");
    setEditedSchema("");
    setMigrationStatus("idle");
    setMigrationProgress(0);
    setErrorMessage("");
    setFirebaseData(null);
    setFetchError(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
  }
  
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <PageWrapper>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Main Flow in a 2-column layout */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Step 1: JSON Input */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileJson className="text-primary" />
                    1. Provide JSON
                  </CardTitle>
                  <CardDescription>
                    Paste your JSON data below or upload a file.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4">
                  <Textarea
                    placeholder='{ "users": { "user1": { "name": "Ada" } } }'
                    className="flex-1 min-h-[250px] font-mono text-xs"
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload JSON File
                  </Button>
                  <Input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".json"
                    onChange={handleFileChange}
                  />
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={handleInferSchema}
                    disabled={isLoadingSchema || !jsonInput}
                  >
                    {isLoadingSchema ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Infer Schema
                  </Button>
                </CardFooter>
              </Card>

              {/* Step 2: Schema Inference */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardPaste className="text-primary" />
                    2. Refine Schema
                  </CardTitle>
                  <CardDescription>
                    Review and edit the AI-inferred schema.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <Textarea
                    placeholder="Schema will appear here..."
                    className="flex-1 h-full font-mono text-xs"
                    value={editedSchema}
                    onChange={(e) => setEditedSchema(e.target.value)}
                    disabled={!inferredSchema || isLoadingSchema}
                  />
                </CardContent>
                <CardFooter>
                  <p className="text-xs text-muted-foreground">
                    The AI will generate a proposed schema structure based on your JSON data. You can modify it before migration.
                  </p>
                </CardFooter>
              </Card>

              {/* Step 3: Data Preview & Migration */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DatabaseZap className="text-primary" />
                    3. Preview & Migrate
                  </CardTitle>
                  <CardDescription>
                    Preview your data and start the migration process.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4">
                  <div className="text-sm font-semibold">Data Preview</div>
                  <div className="border rounded-md p-2 bg-muted/50 h-64 overflow-auto">
                    <pre className="text-xs">{previewData}</pre>
                  </div>
                  <div className="mt-auto pt-4">{migrationStatusContent}</div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={handleMigrate}
                    disabled={
                      !jsonInput || migrationStatus === "inProgress"
                    }
                  >
                    {migrationStatus === "inProgress" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {migrationStatus === 'completed' ? 'Migrate Again' : 'Migrate to Firebase'}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
    </PageWrapper>
  );
}
