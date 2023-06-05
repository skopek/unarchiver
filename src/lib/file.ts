export interface FileInfo {
  name: string;
  body: Uint8Array;
  size: number;
}

export type FileStructureItem =
  | {
      type: "dir";
      name: string;
      fileStructure: FileStructure;
    }
  | {
      type: "file";
      name: string;
      info: FileInfo;
    };

export type FileStructure = FileStructureItem[];

function addFileToFileStructure(structure: FileStructure, path: string[], file: FileInfo) {
  if (path.length === 1) {
    structure.push({ type: "file", name: path[0], info: file });

    return;
  }

  const index = structure.findIndex((item) => item.name === path[0]);

  if (index > -1) {
    const item = structure[index];

    if (item.type === "dir") addFileToFileStructure(item.fileStructure, path.slice(1), file);
    else throw new Error(`${path[0]} is not directory`);
  } else {
    const newItem: FileStructureItem = {
      type: "dir",
      name: path[0],
      fileStructure: [],
    };

    structure.push(newItem);

    addFileToFileStructure(newItem.fileStructure, path.slice(1), file);
  }
}

export function getFileStructure(files: FileInfo[]) {
  const fileStructure: FileStructure = [];

  files.forEach((file) => {
    const path = file.name.split("/");

    addFileToFileStructure(fileStructure, path, file);
  });

  return fileStructure;
}
