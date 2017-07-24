var app = angular.module('myapp', []);

app.controller('main', ['$scope', function($scope) {

  //filereader
  $scope.fileLoad = function(event) {
    var files = event.target.files;
    var fileName;
    var checkJS = /.+\.js/i;
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var reader = new FileReader();
      //check if js file
      if (checkJS.test(file.name)) {
        reader.readAsText(file);
        reader.onload = $scope.fileIsLoaded;
        fileName = file.name;
        $scope.fileNames.push(file.name);
      }
    }
  };

  // angular part of filereader
  $scope.fileIsLoaded = function(e) {
    $scope.$apply(function() {
      $scope.allFiles.push(e.target.result);
    });
  };

  //start of counter
  $scope.fileNames = [];
  $scope.allFiles = [];

  // calculator
  $scope.countFiles = function() {
    $scope.countedFiles = [];
    for (var i = 0; i < $scope.allFiles.length; i++) {
      var fileName = $scope.fileNames[i];
      var file = $scope.allFiles[i];
      $scope.fileParser(fileName, file);
    }
  };

  //reads files and makes classes
  $scope.fileParser = function(nameFile, file) {
    var cleanPhase1 = file.replace(/(\/\/)(.*)/g, "");
    var cleanPhase2 = cleanPhase1.replace(/\/\*[\s\S]*?\*\//g, "");
    var cleanPhase3 = cleanPhase2.replace(/\/.+\//g, "");
    var cleanPhase4 = cleanPhase3.replace(/('.*".*".*')|(".*'.*'.*")/g, "");
    var cleanFile = cleanPhase4.replace(/["'][\s\w.]+["']/g, "");
    fileObject = {};
    fileObject.fileName = nameFile;
    fileObject.fileClasses = [];
    fileObject.lines = $scope.lineCounter(cleanFile);
    //regex declaration
    var classDefinition = /var\s(\w*)\s=\sfunction/;
    var classDefinition2 = /\bfunction\b\s(\w+)\(/;
    var scopeClassDefinition = /(\$scope)\.(\w+)\s\=\sfunction/;
    var classScopeDefinitionMatch = file.match(scopeClassDefinition);
    var splitArray = $scope.splitLines(cleanFile);
    var classNames = [];
    if (!classScopeDefinitionMatch) {
      for (var i = 0; i < splitArray.length; i++) {
        var classDefinitionMatch = splitArray[i].match(classDefinition);
        var classDefinitionMatch2 = splitArray[i].match(classDefinition2);
        if (classDefinitionMatch) {
          classNames.push(classDefinitionMatch[1]);
        } else if (classDefinitionMatch2) {
          classNames.push(classDefinitionMatch2[1]);
        }
      }
    } else if (classScopeDefinitionMatch){
      classNames.push(classScopeDefinitionMatch[1]);
    }
    //classNames.push("Global");
    for (var i = 0; i < classNames.length; i++) {
      var className = classNames[i];
      fileObject.fileClasses.push($scope.classParser(className, cleanFile));
    }
    fileObject.classLineAvg = $scope.calcAvg(fileObject.fileClasses.length, $scope.calcSum(fileObject.fileClasses, "classAvg"));
    fileObject.classLineTotal = $scope.calcSum(fileObject.fileClasses, "classAvg");
    fileObject.overallMethodLineAvg = $scope.calcAvg($scope.calcSum(fileObject.fileClasses, "calcTotalMethod"), $scope.calcSum(fileObject.fileClasses, "calcTotalClassLine"));
    fileObject.globalLines = $scope.calcDiff(fileObject.lines, $scope.calcSum(fileObject.fileClasses, "calcTotalClassLine"));
    $scope.countedFiles.push(fileObject);
    console.log($scope.countedFiles);
  };

  //reads files and matches methods to classes
  $scope.classParser = function(nameClass, file) {
    classObject = {};
    classObject.className = nameClass;
    classObject.classMethods = [];
    var classFunctionDefinition = /\b(\w+)\.prototype\.(\w+)\s\=\s\bfunction/;
    var classScopeFunctionDefinition = /(\$scope)\.(\w+)\s\=\sfunction/;
    var splitArray = $scope.splitLines(file);
    var methods = [];
    for (var i = 0; i < splitArray.length; i++) {
      var classDefinitionMatch = splitArray[i].match(classFunctionDefinition);
      var classScopeDefinitionMatch = splitArray[i].match(classScopeFunctionDefinition);
      if (classDefinitionMatch && (classDefinitionMatch[1] == nameClass)) {
        methods.push(classDefinitionMatch[2]);
      } else if (classScopeDefinitionMatch && (classScopeDefinitionMatch[1] == nameClass)) {
        methods.push(classScopeDefinitionMatch[2]);
      }
    }
    for (var i = 0; i < methods.length; i++) {
      classObject.classMethods.push($scope.methodParser(methods[i], file));
    }
    classObject.classTotal = $scope.calcSum(classObject.classMethods, "lines");
    classObject.methodLineAvg = $scope.calcAvg(classObject.classMethods.length, classObject.classTotal);
    return (classObject);
  };


  $scope.methodParser = function(nameMethod, file) {
    methodObject = {};
    methodObject.methodName = nameMethod;
    methodObject.lines = $scope.functionFinder(file, nameMethod);
    return methodObject;
  };

  // finds and seperates functions from file
  $scope.functionFinder = function(file, methodName) {
    var seperateFunctions = file.split(/;(?:\r?\n){2,}(?:\/\*[\s\S]*?\*\/)*(?=[\s\S])/);
    var counter = 0;
    for (var i = 0; i < seperateFunctions.length; i++) {
      if ($scope.lineMatcher(seperateFunctions[i], methodName) === true) {
        counter = $scope.lineCounter(seperateFunctions[i]);
      }
    }
    return counter;
  };


  $scope.lineMatcher = function(method, methodName) {
    var classFunctionDefinition = /\b(\w+)\.prototype\.(\w+)\s\=\s\bfunction/;
    var classScopeFunctionDefinition = /(\$scope)\.(\w+)\s\=\sfunction/;
    var classDefinitionMatch = method.match(classFunctionDefinition);
    var classScopeDefinitionMatch = method.match(classScopeFunctionDefinition);
    if (classDefinitionMatch && (methodName == classDefinitionMatch[2])) {
      return true;
    } else if (classScopeDefinitionMatch && (methodName == classScopeDefinitionMatch[2])) {
      return true;
    } else {
      return false;
    }
  };

  $scope.lineCounter = function(string) {
    var lines = $scope.splitLines(string);
    var counter = 0;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var periods = line.match(/(\.)/g);
      var assignments = line.match(/[\=\:]/g);
      var ifs = line.match(/if\s\(/g);
      var elses = line.match(/else\s/g);
      var vars = line.match(/var\s(\w+)/g);
      var forLoops = line.match(/for\s\(/g);
      var anonFunctions = line.match(/function\(/g);
      var returns = line.match(/\breturn\b/g);
      var ands = line.match(/\&{2}/g);
      var ors = line.match(/\|{2}/g);
      var comparisons = line.match(/\={2}/g);
      var absoluteComparisons = line.match(/\={3}/g);
      var crocComparisons = line.match(/[<>]/g);
      var unaryOperators = line.match(/[\+\-\*\/]/g);
      var newStuff = line.match(/\bnew\b/g);
      var multiVars = line.match(/var\s(\w\S*)(\,.*)+/g);
      if (periods) {
        counter += periods.length;
      }
      if (ifs) {
        counter += ifs.length;
      }
      if (elses) {
        counter += elses.length;
      }
      if (multiVars) {
        counter += multiVars.length * 2;
      } else if(vars){
        counter += vars.length;
      }
      if (forLoops) {
        counter += forLoops.length;
      }
      if (anonFunctions) {
        counter += anonFunctions.length;
      }
      if (returns) {
        counter += returns.length;
      }
      if (ands) {
        counter += ands.length;
      }
      if (ors) {
        counter += ors.length;
      }
      if (crocComparisons) {
        counter += crocComparisons.length;
      }
      if (unaryOperators) {
        counter += unaryOperators.length;
      }
      if (newStuff) {
        counter += newStuff.length;
      }
      if (absoluteComparisons) {
        counter += absoluteComparisons.length;
      } else if (comparisons) {
        counter += comparisons.length;
      } else if (assignments) {
        counter += assignments.length;
      }
    }
    return counter;
  };

  $scope.splitLines = function(file) {
    return file.split(/\r?\n/);
  };

  $scope.calcSum = function(array, id) {
    var total = 0;
    if (id == "lines") {
      for (var i = 0; i < array.length; i++) {
        var method = array[i];
        total += method.lines;
      }
    } else if (id == "classAvg") {
      for (var i = 0; i < array.length; i++) {
        var className = array[i];
        total += className.classTotal;
      }
    } else if (id == "methodAvg") {
      for (var i = 0; i < array.length; i++) {
        var className = array[i];
        if (className.methodLineAvg > 0) {
          total += className.methodLineAvg;
        }
      }
    } else if (id == "calcTotalMethod") {
      for (var i = 0; i < array.length; i++) {
        var className = array[i];
        total += className.classMethods.length;
      }
    } else if (id == "calcTotalClassLine") {
      for (var i = 0; i < array.length; i++) {
        var className = array[i];
        total += className.classTotal;
      }
    }
    return total;
  };

  $scope.calcAvg = function(length, lines) {
    var avg = lines / length;
    return avg;
  };

  $scope.calcDiff = function(fileTotal, classesTotal) {
    var diff = fileTotal - classesTotal;
    return diff;
  };

  $scope.doSave = function() {
    var outText, file;
    outText = $scope.txtPrinter($scope.countedFiles);
    filename = "LLOCCount.txt";
    saveTextAsFile(outText, filename);
  };

  var saveTextAsFile = function(textToWrite, fileNameToSaveAs) {
    var textFileAsBlob = new Blob([textToWrite], {
      type: 'text/plain'
    });
    var downloadLink = document.createElement("a");
    downloadLink.download = fileNameToSaveAs;
    downloadLink.innerHTML = "Download File";
    var destroyClickedElement = function(event) {
      document.body.removeChild(event.target);
    };
    downloadLink.href = URL.createObjectURL(textFileAsBlob);
    downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
    downloadLink.onclick = destroyClickedElement;
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
  };

  $scope.txtPrinter = function(filesArray) {
    var output = "";
    var avgLinesPerClass = "";
    var avgLinesPerMethod = "";
    var globalLineCount = "";
    for (var i = 0; i < filesArray.length; i++) {
      var files = filesArray[i];
      output += "[FILE" + (i + 1) + "]" + "\r\n";
      output += "File Name: " + files.fileName + " = " + files.lines + " Lines" + "\r\n";
      avgLinesPerClass = "    Average: " + files.classLineAvg + " Lines" + "\r\n";
      avgLinesPerMethod = "    Average: " + files.overallMethodLineAvg + " Lines" + "\r\n";
      globalLineCount = "    Method Name: " + "Global = " + files.globalLines + " Lines" + "\r\n";
      var classesArray = filesArray[i].fileClasses;
      for (var a = 0; a < classesArray.length; a++) {
        var classes = classesArray[a];
        output += " Class Name: " + classes.className + " = " + classes.classMethods.length + " Methods, with " + classes.classTotal + " Lines" + "\r\n";
        var methodsArray = classesArray[a].classMethods;
        for (var b = 0; b < methodsArray.length; b++) {
          var method = methodsArray[b];
          output += "    Method Name: " + method.methodName + " = " + method.lines + " Lines" + "\r\n";
        }
      }
      output += globalLineCount;
      output += "[CLASS]" + "\r\n  " + "  Total: " + files.classLineTotal + " Lines" + "\r\n" + avgLinesPerClass;
      output += "[METHOD] " + "\r\n  " + "  Total: " + files.classLineTotal + " Lines" + "\r\n" + avgLinesPerMethod;
      output += "\r\n" + "-------------------------" + "\r\n\r\n";
    }
    return output;
  };
}]);