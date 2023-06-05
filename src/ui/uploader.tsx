import { Button } from "@mui/joy";
import { ChangeEvent, useRef } from "react";

export interface UploaderProps {
  onChange: (files: FileList) => void;
}

export function Uploader({ onChange }: UploaderProps) {
  const ref = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (files) onChange(files);
  };

  const handleClick = () => {
    ref.current?.click?.();
  };

  return (
    <>
      <input ref={ref} type="file" onChange={handleChange} style={{ display: "none" }} />

      <Button onClick={handleClick}>Choose file</Button>
    </>
  );
}
