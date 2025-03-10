# EmpowerUtils

A collection of utils written by Timber Monson for automating office tasks at an HOA management company.
Basic usage guides are below, and a developer guide is at `./src/README.md` (TODO)

# Initial Install

**nvm & node**

- Windows: install "windows-nvm" by downloading "nvm-setup.exe" from [Here](https://github.com/coreybutler/nvm-windows/releases).
- Then, install the proper node version with `nvm install v22.14.0` and `nvm use v22.14.0`


- macOS: install "nvm" by following the instructions [Here](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating).
- macOS' nvm should auto-install & use the correct node version when you use `cd ./src`

**npm packages**

- Install npm/nodemon globally with `npm i -g nodemon`
- Set your cwd with `cd ./src` (do this before doing anything else, really)
- Clear out old packages with `rm -Force node_modules` on Windows, or `rm -rf node_modules` on mac.
- run `npm i` to install all packages.

# Address Scraper

**This app**:

- _Intakes:_ A list of full names, formatted as below.
- _Does:_ A search for every person in every supported county (via real-estate parcel searches).
- _Outputs:_ For each county, a list of each person's address results.
- _Console-Logs:_ A "score" for each county. If a county has *any* results for all 4 inputted people, its score is 4. If none, its score is 0. This is used to help determine which county all searched people are most likely to reside in.

**Example Screenshot** (ignore duplicated score lines, it was a rendering issue on my end)
![image](https://github.com/user-attachments/assets/78fcc6ea-6973-4946-9eb3-8d88d4574e66)


### Input Format:

Names must be formatted like: `Title Firstname Lastname, Title Firstname Middlename Lastname`

- Titles are ignored, but must be present.
- Names must be separated by commas.
- Middlenames are optional, but if present, are always included in the search.

- Extra spaces are ignored.
- Duplicates are ignored.

Valid Examples:

`Director John G Smith, Treasurer Timber M Monson, President George Washington`

`D John     Smith, T Timber Monson   , P George Washington `

### Setup:

- `cd ./src`
- In `src/ioFiles`, create a `input.txt`.
- Put your name list into `input.txt`

### Execution:

- Ensure `cd ./src` has been run
- Run app with `npm run addr`
- Output will appear in `src/ioFiles/output.txt`
- Pasting new namelists into `input.txt` will automatically trigger the app to run again.

### Extra Options:

- `npm run addr json` Outputs a newline-less json blob of the results (with a bit more information)
- `num run addr both` Outputs both.

# Business Principal Extractor

This app is designed to help with copying business principals from Utah's business-search into the above-app's required format.

It:
- _Intakes:_ (from `src/ioFiles/input.txt`) A click-drag copy-paste of the "Business Principals" table on the Utah Business Search website.
- _Outputs:_ (into `src/ioFiles/output.txt`) The list of business principals, formatted as above & with titles shortened.

**Example Screenshots:**
![image](https://github.com/user-attachments/assets/5be0f8c1-d24e-4250-a471-e93de877215c)
![image](https://github.com/user-attachments/assets/b57b57bb-3e9b-4bcd-9f14-0fba94ce968b)

**Execution**

- Ensure `cd ./src` has been run
- Run app with `npm run ebp`
- Output will appear in `src/ioFiles/output.txt`
