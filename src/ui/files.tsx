import { mdiFileOutline, mdiFolderOutline } from "@mdi/js";
import Icon from "@mdi/react";
import {
  Breadcrumbs,
  Card,
  Link,
  List,
  ListDivider,
  ListItem,
  ListItemButton,
  ListItemDecorator,
} from "@mui/joy";
import { Fragment, useMemo, useState } from "react";
import { FileStructure, FileStructureItem } from "../lib/file";

function getFilesByPath(fileStructure: FileStructure, path: string[]): FileStructure {
  if (path.length === 0) return fileStructure;

  const index = fileStructure.findIndex((item) => item.name === path[0]);
  const item = fileStructure[index];

  if (item.type === "dir") return getFilesByPath(item.fileStructure, path.slice(1));

  throw new Error(`${path[0]} is not directory`);
}

export interface FilesCardProps {
  fileStructure: FileStructure;
}

export function FilesCard({ fileStructure }: FilesCardProps) {
  const [path, setPath] = useState<string[]>([]);

  const files = useMemo(() => getFilesByPath(fileStructure, path), [fileStructure, path]);

  const handleClick = (file: FileStructureItem) => () => {
    if (file.type === "dir") setPath((p) => [...p, file.name]);
    else {
      const a = document.createElement("a");
      document.body.appendChild(a);
      a.style.display = "none";

      const blob = new Blob([file.info.body]),
        url = window.URL.createObjectURL(blob);

      a.href = url;
      a.download = file.name;
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    }
  };

  const handleClickBreadcrumb = (index: number) => () => {
    setPath((p) => p.slice(0, index + 1));
  };

  return (
    <Card variant="outlined" sx={{ p: 0, my: 2 }}>
      <Breadcrumbs>
        <Link onClick={handleClickBreadcrumb(-1)}>&#8962;</Link>

        {path.map((item, index) => (
          <Link onClick={handleClickBreadcrumb(index)} key={index}>
            {item}
          </Link>
        ))}
      </Breadcrumbs>

      <List
        sx={{
          borderTop: "1px solid #D8D8DF",
          "--ListItem-paddingLeft": "1.5rem",
          "--ListItem-paddingRight": "1rem",
        }}
      >
        {files.map((file, index) => (
          <Fragment key={index}>
            <ListItem>
              <ListItemButton onClick={handleClick(file)}>
                <ListItemDecorator>
                  <Icon path={file.type === "file" ? mdiFileOutline : mdiFolderOutline} />
                </ListItemDecorator>

                {file.name}
              </ListItemButton>
            </ListItem>

            {index < files.length - 1 ? <ListDivider /> : null}
          </Fragment>
        ))}
      </List>
    </Card>
  );
}
