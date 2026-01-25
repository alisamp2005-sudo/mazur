import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Phone, Trash2, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function PhoneNumbers() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [queueDialogOpen, setQueueDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: phoneData, isLoading, refetch } = trpc.phoneNumbers.list.useQuery({ limit: 100, offset: 0 });
  const { data: agents } = trpc.agents.list.useQuery();
  const uploadMutation = trpc.phoneNumbers.upload.useMutation();
  const deleteMutation = trpc.phoneNumbers.delete.useMutation();
  const addToQueueMutation = trpc.queue.add.useMutation();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'csv' || ext === 'xls' || ext === 'xlsx') {
        setSelectedFile(file);
      } else {
        toast.error("Please select a CSV or Excel file");
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const base64Data = base64.split(',')[1]; // Remove data:...;base64, prefix

        try {
          const result = await uploadMutation.mutateAsync({
            filename: selectedFile.name,
            base64Data,
          });

          toast.success(`Imported ${result.imported} phone numbers${result.invalid > 0 ? ` (${result.invalid} invalid)` : ''}`);
          setUploadDialogOpen(false);
          setSelectedFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          refetch();
        } catch (error: any) {
          toast.error(error.message || "Failed to upload file");
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      toast.error("Failed to read file");
    }
  };

  const handleDelete = async () => {
    if (selectedNumbers.length === 0) {
      toast.error("No numbers selected");
      return;
    }

    if (!confirm(`Delete ${selectedNumbers.length} phone number(s)?`)) return;

    try {
      await deleteMutation.mutateAsync({ ids: selectedNumbers });
      toast.success(`Deleted ${selectedNumbers.length} phone number(s)`);
      setSelectedNumbers([]);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete numbers");
    }
  };

  const handleAddToQueue = async () => {
    if (selectedNumbers.length === 0) {
      toast.error("No numbers selected");
      return;
    }

    if (!selectedAgent) {
      toast.error("Please select an agent");
      return;
    }

    try {
      const result = await addToQueueMutation.mutateAsync({
        phoneNumberIds: selectedNumbers,
        agentId: parseInt(selectedAgent),
        priority: 0,
      });

      toast.success(`Added ${result.added} numbers to queue`);
      setQueueDialogOpen(false);
      setSelectedNumbers([]);
      setSelectedAgent("");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to add to queue");
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedNumbers(prev =>
      prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedNumbers.length === phoneData?.numbers.length) {
      setSelectedNumbers([]);
    } else {
      setSelectedNumbers(phoneData?.numbers.map(n => n.id) || []);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Batch Calls</h1>
          <p className="text-muted-foreground mt-2">Upload phone numbers and run batch calling campaigns</p>
        </div>
        <div className="flex gap-2">
          {selectedNumbers.length > 0 && (
            <>
              <Button variant="outline" onClick={() => setQueueDialogOpen(true)}>
                <PlayCircle className="h-4 w-4 mr-2" />
                Add to Queue ({selectedNumbers.length})
              </Button>
              <Button variant="outline" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedNumbers.length})
              </Button>
            </>
          )}
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload CSV/XLS
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Phone Numbers ({phoneData?.total || 0})</CardTitle>
          <CardDescription>Imported phone numbers for batch calling campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : phoneData && phoneData.numbers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedNumbers.length === phoneData.numbers.length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Calls</TableHead>
                  <TableHead>Metadata</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phoneData.numbers.map((number) => (
                  <TableRow key={number.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedNumbers.includes(number.id)}
                        onCheckedChange={() => toggleSelection(number.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono">{number.phone}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(number.status)}`}>
                        {number.status}
                      </span>
                    </TableCell>
                    <TableCell>{number.callCount}</TableCell>
                    <TableCell>
                      {number.metadata ? (
                        <code className="text-xs">{JSON.stringify(JSON.parse(number.metadata), null, 0).substring(0, 50)}...</code>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {number.createdAt ? new Date(number.createdAt).toLocaleDateString() : "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No phone numbers uploaded yet</p>
              <Button className="mt-4" onClick={() => setUploadDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Your First File
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Phone Numbers</DialogTitle>
            <DialogDescription>
              Upload a CSV or Excel file with phone numbers for batch calling. The file must have a column named "phone" or "phone_number".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  {selectedFile ? selectedFile.name : "Click to select CSV or Excel file"}
                </p>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setUploadDialogOpen(false);
              setSelectedFile(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!selectedFile || uploadMutation.isPending}>
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Queue Dialog */}
      <Dialog open={queueDialogOpen} onOpenChange={setQueueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Call Queue</DialogTitle>
            <DialogDescription>
              Select an agent to call {selectedNumbers.length} phone number(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Agent</Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents?.filter(a => a.isActive).map((agent) => (
                    <SelectItem key={agent.id} value={agent.id.toString()}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQueueDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddToQueue} disabled={!selectedAgent || addToQueueMutation.isPending}>
              {addToQueueMutation.isPending ? "Adding..." : "Add to Queue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "failed":
      return "bg-red-100 text-red-800";
    case "calling":
      return "bg-blue-100 text-blue-800";
    case "queued":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
