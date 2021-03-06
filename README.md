Welcome to Tidal Wave!  Tidal wave is a modern interpretation of a wiki engine
intended for teams to both collaborate in real-time and keep rich, living
documentation on their projects.  [Click to see a demo wiki.](http://tidalwave-demo.herokuapp.com/view#/Welcome)

# Features

- Collaborative, real-time editing of pages encourages people to work together and keep documentation up-to-date.
- Markdown allows for more rich, expressive content.

# How to use

- Creating a page
    - Type the new page name in the search bar and click the pencil icon
- Editing a page
    - Select the page and click "Edit" from the navigation bar
- Exporting a page to HTML / PDF
    - Select the page and choose "Export" and then the file type
- Adding images to a page
    - While editing a page, Drag and drop the image onto the editor
    - Note that images are added as pure html instead of markdown so that the width/height can be adjusted
- Adding attachments to a page
    - Similar to images, drag and drop the file into the editor
    - Note that file are added as pure html instead of markdown because there is no way to open links in a new tab with pure markdown.
- Granting/Locking down access
    - While editing a page, choose "Settings" from the navbar
    - Here you can grant permissions to access the page
    - Note that any permissions given to the page will propagate to any children.
- Code Snippets
    - Code snippets should be indented or escaped with triple backquotes, like the following:

```
    public static void main(String args[]) {
        return 0;
    }
```

# How to run a server

## Dependencies

The dependencies that aren't automatically installed are npm and MongoDb:

### Installing MongoDB

OS/X ```brew install mongo && brew install npm```

Linux ```sudo apt-get install mongodb-server npm```

Windows ```(no idea)```

```
git clone https://github.com/MisterTea/TidalWave.git
cd TidalWave
npm start
```

Then visit [http://localhost:3000/](http://localhost:3000/) and you should see your own TidalWave server.

# Contact

Please send ~~hate mail~~ feedback to <a href="mailto:jgmath2000@gmail.com">jgmath2000@gmail.com</a>
