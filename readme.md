# themummy

# Warning!!!
# UNSTABLE STILL in development

at the moment, just reserving a cool package name, though looking to link codecoverage providing in Chromium >60 with nodejs as integration tests.

## process recording
+ launches chrome
- each ui interactions
  + start recording coverage
  + run ui interaction
  - ui interaction hardcoded could recieve list of scripts as argument
    + click queryselector
    - typing, keyboard events
    - mousemove hover events
    - scroll events
    - maybe look into using cypress test runner
  + stop recording coverage
  + save snapshot
    - in saving snapshot could convert to segments here.
    (a segment is a from to, offset of code)
    - also merge and save coverage percentage
    -* coverage percentage fn covered
+ exit chrome

## process viewing
- generate static files like lcov
+ after launch view server
+ displays files sidebar
- displays snaps sidebar
+ click file, opens it uses codemirror like chrome
  - bug codemirror breaks for minified files
+ coverage snaps are converted to segments, segments are merged
+ codemirror puts style className on used or unused code
+ percentage in sidebar
- codemirror
  - count overlay how many times fn called
  - cursor move, sidebar shows snaps used
- snaps sidebar
  - open snap sidebar, causes filter on files
  - select only and select multiple
- sidebar search


## process overview
- open overview instead of file view
- track record, x sample, y totalcoverage percentage
  (abit like coveralls)
- track file record like coveralls, either up or down percent
- track hits/line ratio
- generate relevant lines

## automated running
- on git commit
- on git merge

## todolist +: done, -: todo, *:active
  + launch chrome
