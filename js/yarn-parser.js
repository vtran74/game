function capSquareBrackets(line)
{
  //Finds "[[...]]" and gets its content
  var regExp = /\[\[(.*?)\]\]/i;
  var capture = regExp.exec(line);
  //Build a new choice target that will be populated
  var choice = {"target":"", "text":""};


  if(capture == null)
  {
    return false;
  } else 
  {
    //The choice text and identifier for the choice is in [[here]]
    //Splits the text and identifier at the | character
    var data = capture[1].split('|');
    var choice = {"target":"", "text":""};

    choice.text = data[0].trim();
    if(data.length > 1)
    {
      choice.target = data[1].trim().toLowerCase();
    }
    return choice;
  }
}

function capAngleBrackets(line)
{
  //Find "<<... ...>>"
  //This is a logic block that can be actions.
  //Capture their names and options.
  var regExp = /(\<\<(.*?) (.*?)\>\>)+/g;
  var match;
  var blocks = [];
  //Searches until there's no match left
  while((match = regExp.exec(line)) != null)
  {
    blocks.push({
      "type":match[2],
      "options":match[3].split(' ')
    });
  }
  return blocks;
}

function capCurlyBrackets(line)
{
  //Find "{{...,...}}" or "{{...}}"
  //These are character blocks that defines which character is speaking
  //and in what pose they are (represented by the different images of them)
  var regExp = /(\{\{(.*?)\}\})+/g;
  var capture = regExp.exec(line);

  var characterData = {"id":"", "pose":"default"};

  if(capture == null)
  {
    return false;
  } else 
  {
    //The character id and its optional pose are written as
    //{{id,pose}} or simply {{id}}
    var data = capture[2].split(',');
    characterData.id = data[0].trim().toLowerCase();
    if(data.length > 1)
    {
      characterData.pose = data[1].trim().toLowerCase();
    }
  }
  return characterData;
}

function parseStory()
{
  var autoIncrement = 0;
  //For every node
  for(var node in story)
  {
    //Split the content into lines
    var lines = story[node].body.split('\n');

    var currentScene = false;
    //This is the name of the first scene created in this node
    var firstSceneName = story[node].title;

    //For each line in this scene
    for(var l in lines)
    {
      var line = lines[l];
      line = line.trim()
      if (line.length == 0) continue; //Ignore empty lines
      if (line.substr(0,2) == "//") continue; //Ignore comments

      if(currentScene != false && 
          currentScene.choices.length > 0 &&
          line.substr(0,2) != "[[")
      {
        for(var c in currentScene.choices)
        {
          //Generate implicit scene changes for choices that didn't specify a target
          if(currentScene.choices[c].target == "")
          {
            currentScene.choices[c].target = "autogenerated_"+autoIncrement;  
          }          
        }
        //Add the scene to the final list
        scenes[currentScene.id] = currentScene;
        //And reset the current scene so that we can generate a new one
        currentScene = false;  
      }

      //If we don't have a scene to work with
      if(!currentScene)
      {
        //Create scenes if there is none
        currentScene = {
          "id":"",
          "choices":[],
          "actions":[],
          "character":false
        }

        if(firstSceneName)
        {
          currentScene.id = story[node].title.trim().toLowerCase();
          firstSceneName = false;
        } else 
        {
          currentScene.id = "autogenerated_"+autoIncrement;
          autoIncrement++;
        }
      }
    
      //Build a new choice that will be populated
      var choice = {"target":"", "text":""};
    
      //Parse the line for character data
      var characterData = capCurlyBrackets(line);
      if(!characterData)
      {
        //This adds some default stuff if there's no character data.
        characterData = {"id":"default", "pose":"hidden"};
      } else
      {
        var characterRegExp = /(\{\{.*?\}\})+/g;
        line = line.replace(characterRegExp, "");
      }

      //Parse the line for explicit choicess
      var choiceData = capSquareBrackets(line);
      //Parse the line for logic blocks (Actions)
      var logicData = capAngleBrackets(line);
      

      if(choiceData)
      {
        choice.target = choiceData.target;
        choice.text = choiceData.text;

        //Add the choice to the scene
        currentScene["choices"].push(choice);
        //Add the character data to the scene
        currentScene.character = characterData;

      } else if (logicData.length > 0)
      {
        //There's at least one Action block on this line
        //Add it to the list of actions for the current scene
        currentScene.actions = currentScene.actions.concat(logicData);
        continue;
      } else
      {
        //No choice data, no Action.
        //this generates an implicit scene change.
        choice.target = "autogenerated_"+autoIncrement;
        choice.text = line.trim();

        //Add the choice to the scene
        currentScene["choices"].push(choice);
        //Add the character data to the scene
        currentScene.character = characterData;
        //Add the scene to the final list
        scenes[currentScene.id] = currentScene;
        //And reset the current scene so a new one can be genearated
        currentScene = false;
      }
      
    }

    if(currentScene)
    {
      scenes[currentScene.id] = currentScene;
    }
  }
}