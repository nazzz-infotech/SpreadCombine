import { useState } from "react";
import {
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  Typography,
  Box,
  Checkbox,
  FormControlLabel,
  Stepper,
  Step,
  StepLabel,
  createTheme,
  AppBar,
  Toolbar,
} from "@mui/material";
import "./home.scss";
import * as XLSX from "xlsx";
import { ThemeProvider } from "@emotion/react";

const steps = ["Select Files", "Export", "Finish"];

function Home() {
  const [files, setFiles] = useState([]);
  const [fileContents, setFileContents] = useState([]);
  const [deleteDuplicate, setDeleteDuplicate] = useState(false);
  const [finalData, setFinalData] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [csvSavedDirPath, setCsvSavedDirPath] = useState("");
  const [xlsxSavedDirPath, setXlsxSavedDirPath] = useState("");

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setFiles([]);
    setFileContents("");
    setDeleteDuplicate(false);
    setCsvSavedDirPath("");
    setXlsxSavedDirPath("");
  };

  const handleDuplicateCheckbox = (event) => {
    setDeleteDuplicate(event.target.checked);
  };

  const myTheme = createTheme({
    palette: {
      primary: {
        main: "#2e7d32",
      },
      secondary: {
        main: "#ad1457",
      },
    },
  });

  function getFolderPath(filePath) {
    const lastSlashIndex = filePath.lastIndexOf("/");
    const lastBackslashIndex = filePath.lastIndexOf("\\");

    // Determine the correct last separator index based on the path style
    const lastSeparatorIndex = Math.max(lastSlashIndex, lastBackslashIndex);

    if (lastSeparatorIndex === -1) {
      // No separator found, meaning it's just a filename in the current directory
      return "";
    } else {
      // Extract the substring up to the last separator
      return filePath.substring(0, lastSeparatorIndex);
    }
  }

  function processCsv() {
    try {
      let headersMap = new Map(); // header -> rows

      fileContents.forEach((content, fileIndex) => {
        const rows = String(content)
          .replace(/\r/g, "")
          .split("\n")
          .filter((r) => r.trim() !== "");

        if (rows.length === 0) return;

        const header = rows[0];
        const bodyRows = rows.slice(1);

        // ✅ If deleteDuplicate = true, group by header
        // ✅ If false, group by file index to keep them separate
        const headerKey = deleteDuplicate ? header : `${header}__file${fileIndex}`;

        if (!headersMap.has(headerKey)) {
          headersMap.set(headerKey, []);
        }

        bodyRows.forEach((row) => {
          if (row.trim() !== "") {
            headersMap.get(headerKey).push(row);
          }
        });
      });

      let finalCsvParts = [];

      headersMap.forEach((rows, headerKey) => {
        let combinedRows = rows;

        if (deleteDuplicate) {
          combinedRows = [...new Set(combinedRows)];
        }

        // strip file index marker if present
        const header = headerKey.split("__file")[0];

        finalCsvParts.push([header, ...combinedRows].join("\n"));
      });

      const csvString = finalCsvParts.join("\n\n");
      setFinalData(csvString);

      handleNext();
    } catch (error) {
      setFiles(["Error To Export CSV"]);
      console.error(error);
    }
  }

  // function for export as CSV file
  const exportToCsv = async (data) => {
    try {
      const result = await window.electron.saveFile(data, {
        title: "Export as CSV",
        filter: [
          {
            name: "Commas Spread Values",
            extensions: ["csv"],
          },
          {
            name: "All Files",
            extensions: ["*"],
          },
        ],
      });

      const dirPath = getFolderPath(result.filePath);
      setCsvSavedDirPath(dirPath);
      console.log(`CSV Folder Path :- ${dirPath}`);
    } catch (error) {
      console.error(error);
    }
  };

  // function for export as XLSX file (Excel File)
  const exportToXlsx = async (data) => {
    try {
      // Parse CSV string into array
      const rows = XLSX.read(data, { type: "string" });

      // Convert to XLSX workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, rows.Sheets[rows.SheetNames[0]], "DATA");

      // Write workbook to a buffer
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      const result = await window.electron.saveFile(buffer, {
        title: "Export as XLSX",
        filter: [
          {
            name: "Microsoft Excel Spread Sheets XLSX File",
            extensions: ["xlsx"],
          },
          {
            name: "All Files",
            extensions: ["*"],
          },
        ],
      });

      const dirPath = getFolderPath(result.filePath);
      setXlsxSavedDirPath(dirPath);
      console.log(`XLSX Folder Path :- ${dirPath}`);
    } catch (error) {
      console.error(error);
    }
  };

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    setFiles(selectedFiles);

    const promises = selectedFiles.map((file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = ({ target }) => {
          resolve(target.result);
        };
        reader.onerror = reject;

        reader.readAsText(file);
      });
    });

    Promise.all(promises).then((contents) => {
      setFileContents(contents);
    });
  };

  function openDirectory(path) {
    window.electron.openFolder(path);
  }

  const Exports = () => {
    return (
      <>
        <FormControlLabel
          control={<Checkbox checked={deleteDuplicate} onChange={handleDuplicateCheckbox} />}
          label={"Delete Duplicate Headers"}
        />
        <Box height={15} />

        <Button variant="contained" onClick={processCsv}>
          Combine
        </Button>
        <Box height={2} />
        <div>
          <hr />
          <Button variant="outlined" onClick={handleBack}>
            {"<"}
            {"<"} Back
          </Button>
        </div>
      </>
    );
  };

  const FileSelector = () => {
    return (
      <>
        <input
          id="csvFileInput"
          type="file"
          multiple
          accept=".csv"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        <Button variant="contained" onClick={handleButtonClick}>
          Select CSV File(s)
        </Button>
        <Box height={15} />
        <List className="selectedFileContainer">
          {files.length !== 0 ? (
            files.map((file, index) => (
              <Typography component="p" variant="h6" key={index}>
                <ListItem>{file.name}</ListItem>
              </Typography>
            ))
          ) : (
            <Typography component="span" variant="h5" sx={{ paddingLeft: 2 }}>
              No Files Selected
            </Typography>
          )}
        </List>
        <Box height={8} />
        <div className="selectInfo">
          <Typography component={"span"} variant="body1">
            <em>Note ={">"} Your File Selecting Grouping is mater for combining data.</em>
          </Typography>
        </div>
        <Box height={2} />
        <div style={{ direction: "rtl" }}>
          <hr />
          {(() => {
            if (files.length !== 0) {
              return (
                <>
                  {" "}
                  <Button variant={"contained"} onClick={handleNext}>
                    {"<<"} next
                  </Button>{" "}
                  {/* This Revere Content for show correct with right-to-left direction (rtl) */}
                </>
              );
            } else {
              return (
                <Button variant={"contained"} onClick={handleNext} disabled>
                  {"<<"} next
                </Button>
              );
            }
          })()}
        </div>
      </>
    );
  };

  const FinishPage = () => {
    return (
      <>
        <div className="finishDiv">
          <Typography variant="h4" component={"span"}>
            Your File{files.length > 1 ? "s" : ""} Combined Successfully !!!
          </Typography>
          <Box height={8} />

          <Button
            variant="contained"
            onClick={() => {
              exportToCsv(finalData);
            }}
          >
            Export as CSV File
          </Button>
          {(() => {
            if (csvSavedDirPath !== "") {
              return (
                <>
                  <Box height={8} />
                  <div className="fileSavedPathContainer">
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => {
                        openDirectory(csvSavedDirPath);
                      }}
                    >
                      Open CSV folder
                    </Button>
                  </div>
                </>
              );
            }
          })()}
          <Box height={6} />
          <hr />
          <Box height={6} />
          <Button
            variant="contained"
            onClick={() => {
              exportToXlsx(finalData);
            }}
          >
            Download as XLSX (Excel) File
          </Button>
          {(() => {
            if (xlsxSavedDirPath !== "") {
              return (
                <>
                  <Box height={8} />
                  <div className="fileSavedPathContainer">
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => {
                        openDirectory(xlsxSavedDirPath);
                      }}
                    >
                      Open XLSX folder
                    </Button>
                  </div>
                </>
              );
            }
          })()}
        </div>
        <Box height={2} />
        <hr />
        <Box height={2} />
        <div className="bottom_buttons_finish">
          <Button variant="outlined" onClick={handleReset}>
            reset
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="contained" onClick={handleBack}>
            {"<<"} Back
          </Button>
        </div>
      </>
    );
  };

  const handleButtonClick = () => {
    document.getElementById("csvFileInput").click();
  };

  return (
    <ThemeProvider theme={myTheme}>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static" sx={{ borderRadius: 1 }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              SpreadCombine
            </Typography>
          </Toolbar>
        </AppBar>
      </Box>
      <Box height={12} />
      <Card>
        <CardContent>
          <Box
            sx={{
              width: "95%",
              backgroundColor: "#f0fff1ff",
              borderRadius: 2,
              border: "darkgray, 1px, solid",
              padding: 2,
            }}
          >
            {/* Stepper Header */}
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label, index) => (
                <Step key={index}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
          <Box height={12} />
          {(() => {
            if (activeStep === 0) {
              return <FileSelector />;
            } else if (activeStep === 1) {
              return <Exports />;
            } else if (activeStep === 2) {
              return <FinishPage />;
            } else {
              return <h1>Unknown Page</h1>;
            }
          })()}
        </CardContent>
      </Card>
    </ThemeProvider>
  );
}

export default Home;
