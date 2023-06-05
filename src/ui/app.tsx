import { mdiArrowLeft } from "@mdi/js";
import Icon from "@mdi/react";
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  CssBaseline,
  CssVarsProvider,
  GlobalStyles,
  Stack,
  Typography,
} from "@mui/joy";
import { useEffect, useState } from "react";
import { FileStructure, getFileStructure } from "../lib/file";
import { FilesCard } from "./files";
import { Uploader } from "./uploader";

const worker = new Worker(new URL("../lib/worker.ts", import.meta.url), {
  type: "module",
});

export function App() {
  const [fileStructure, setFileStructure] = useState<FileStructure | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === "data") {
        const structure = getFileStructure(e.data.data);

        setFileStructure(structure);
        setLoading(false);
      } else if (e.data.type === "error") {
        setLoading(false);
        setError(e.data.error);
      }
    };

    worker.addEventListener("message", handleMessage);
  }, []);

  const handleChange = async (files: FileList) => {
    if (files?.length) {
      const file = files[0];

      setLoading(true);

      worker.postMessage(file);
    }
  };

  const back = () => {
    setFileStructure(null);
  };

  return (
    <CssVarsProvider>
      <CssBaseline />

      <GlobalStyles
        styles={{
          body: {
            backgroundColor: "#fafafa",
          },
          svg: {
            color: "var(--Icon-color)",
            margin: "var(--Icon-margin)",
            fontSize: "var(--Icon-fontSize, 20px)",
            width: "1em",
            height: "1em",
          },
        }}
      />

      <Stack justifyContent="space-between" sx={{ minHeight: "100vh" }}>
        <Box
          sx={{
            width: 600,
            mx: "auto",
            p: 2,
          }}
        >
          {fileStructure ? (
            <>
              <Button onClick={back} color="neutral" startDecorator={<Icon path={mdiArrowLeft} />}>
                Back
              </Button>

              <FilesCard fileStructure={fileStructure} />
            </>
          ) : (
            <>
              <Typography level="h1" textAlign="center" mb={2}>
                Unarchiver
              </Typography>

              <Typography level="body1" textAlign="center">
                It is a online tool that can extract compressed files.
              </Typography>
              <Typography level="body2" textAlign="center" mb={2}>
                Supported files: tgz, tar
              </Typography>

              <Card variant="outlined">
                {error ? (
                  <Alert color="danger" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                ) : null}

                {loading ? (
                  <Box sx={{ display: "flex", justifyContent: "center" }}>
                    <CircularProgress />
                  </Box>
                ) : null}

                {!loading ? <Uploader onChange={handleChange} /> : null}
              </Card>
            </>
          )}
        </Box>

        <Box sx={{ p: 2 }}>
          <Typography level="body3">Created by Mateusz Skopowski</Typography>
        </Box>
      </Stack>
    </CssVarsProvider>
  );
}
