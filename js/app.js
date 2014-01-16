/** VARIABLES **/
var DEFAULT_SORT = 'date';
var NUM_GOALS = 0;

/** DATABASE SETUP **/

var db = openDatabase("Test", "1.0", "Test", 65535);

// concerns database
db.transaction (function (transaction) {
  var sql = "CREATE TABLE IF NOT EXISTS goals "
    + " (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "
    + "name VARCHAR(100) NOT NULL, "
    + "date DATETIME NOT NULL, "
    + "team VARCHAR(100) NOT NULL,"
    + "notes TEXT NOT NULL)"
  transaction.executeSql(
    sql, 
    undefined, 
    function () {}, 
    function (transaction, err) {
      console.error(err);
    }
  );
});

// doctors database
db.transaction (function (transaction) {
  var sql = "CREATE TABLE IF NOT EXISTS caregivers "
    + " (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT," 
    + "name VARCHAR(100) NOT NULL, " 
    + "specialty VARCHAR(100) NOT NULL)"
  transaction.executeSql(
    sql,
    undefined,
    function () {},
    function (transaction, err) {
      console.error(err);
    }
  );
});

// clear everything!
$(document).on('tap', '#clear-all-goals', function () {

  var num_goals = 0;

  db.transaction(function (transaction) {
    var sql = 'SELECT * FROM goals';
    transaction.executeSql(
      sql,
      undefined, 
      function (transaction, result) {
        num_goals = result.rows.length
      },
      function (transaction, err) {
        console.error(err);
      }
    );
  });

  // drop goals table
  db.transaction(function (transaction) {
    var sql = 'DROP TABLE goals';
    transaction.executeSql(
      sql,
      undefined,
      function () {},
      function (transaction, err) {
        console.error(err);
      }
    );
  });

  db.transaction(function (transaction) {
    var sql = 'DROP TABLE caregivers';
    transaction.executeSql(
      sql,
      undefined,
      function () {
        location.reload();
      },
      function (transaction, err) {
        console.error(err);
      }
    );
  });

});

/** ADD GOAL **/

// navigate to add goal page
$(document).on('tap', '#add-goal-button', function () {

  display_team_choices();

});

// add goal
$(document).on('tap', '#add-goal-action', function () {

  // get values
  var goal_name = $('#goal-name').val();
  var team_checked = $('#team-choices input:checked');
  var goal_notes = $('#goal-notes').val();
  var goal_id = 0;

  // check if required fields are filled in
  if ((goal_name != '') && (team_checked.length > 0)) {

    // create list of 'team'
    var team = team_checked.attr('id');
    for (var n = 1; n < team_checked.length; n++) {
      team += ',' + $(team_checked[n]).attr('id');
    }

    // add to databasae
    db.transaction(function (transaction) {
      var sql = "INSERT INTO goals (name, date, team, notes) VALUES (?, ?, ?, ?)";
      transaction.executeSql(
        sql,
        [goal_name, new Date(), team, goal_notes],
        function (transaction, result) {
          goal_id = result.insertId;
        },
        function (transaction, err) {
          console.error(err);
        }
      );
    });

    db.transaction(function (transaction) {
      var sql = 'DROP TABLE status' + goal_id;
      transaction.executeSql(
        sql,
        undefined,
        function () {
          db.transaction(function (transaction) {
            var sql = "CREATE TABLE IF NOT EXISTS status" + goal_id
              + " (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "
              + "date DATETIME NOT NULL, "
              + "progress INTEGER NOT NULL,"
              + "notes TEXT NOT NULL)"
            console.log(sql);
            transaction.executeSql(
              sql, 
              undefined, 
              function () {}, 
              function (transaction, err) {
                console.error(err);
              }
            );
          });
        },
        function (transaction, err) {
          console.error(err);
        }
      );
    });

    // clear inputs
    for (var i=0; i < team_checked.length; i++) {
      team_checked[i].click();
    }
    $("#goal-name").val('');
    $('#goal-notes').val('');

    // display default
    display_goals(DEFAULT_SORT);

    // change page
    $.mobile.changePage('#list-goals');

  } else {
    alert('Please fill in all required fields!');
  }
});

/** TEAM MEMBERS **/

// add team members
$(document).on('tap', '#add-team-action', function () {

  db.transaction(function(transaction) {
    var sql = 'INSERT INTO caregivers (name, specialty) VALUES (?, ?)';
    transaction.executeSql(
      sql,
      [$('#cg-name').val(), $('#cg-specialty').val()],
      function(transaction, result) {

        // clear value
        $i = result.insertId;
        $('#cg-name').val('');
        $('#cg-specialty').val('');

        // display choices with new doctor
        display_team_choices();

        // automatically check doctor off
        setTimeout(function() {
          $('#cg-' + $i).prop('checked', true).checkboxradio('refresh');
        }, 100);
      },

      function(transaction, error) {
        console.error(error);
      }
    );
  });

});

// display possible team members
function display_team_choices() {
  db.transaction(function (transaction) {
    var sql = 'SELECT * FROM caregivers';
    transaction.executeSql(
      sql,
      undefined,
      function (transaction, result) {

        // check if there are caregivers
        if (result.rows.length) {
          $('#no-team').css('display', 'none');

          // append html for new caregivers
          var doctors_displayed = $('#team-choices-div input').length
          for (var i=doctors_displayed; i<result.rows.length; i++) {
            var row = result.rows.item(i);
            var cgId = 'cg-' + row.id;
            $('#team-choices-div').append(
              "<input type='checkbox' name='" + cgId + "' id='" + cgId + "' />"
              + "<label for='" + cgId + "'>" + row.name + "</label>"
            ).trigger('create');
          }
        }
      },
      function (transaction, err) {
        console.err(err);
      }
    );
  });
}

/** DISPLAY GOALS **/ 
$(document).on('pageshow', '#list-goals', function () {

  display_goals(DEFAULT_SORT);

});

function display_goals(sorted_by) {

  // fix the selector
  $("#sort-goals").val(sorted_by).attr('selected', true).siblings('option').removeAttr('selected');
  
  db.transaction( function (transaction) {

    var sql = "SELECT * FROM goals"
    
    // add sorted by params
    if (sorted_by == 'date') {
      sql += " ORDER BY " + sorted_by + ' DESC';
    } else {
      sql += " ORDER BY " + sorted_by;
    }

    transaction.executeSql(
      sql, 
      undefined, 
      function (transaction, result) {
        if (result.rows.length) {

          // remove previous elements
          $("#goals-list").empty();
          $("#no-goals").css("display","none");

          // add each list item
          for (var i = 0; i < result.rows.length; i++) {
            var row = result.rows.item(i);
            $("#goals-list").append(
              "<li id='" + row.id + "' class='ui-li-has-alt'>"
              + "<a href='#add-goal' onclick='set_details("+row.id+")' class='ui-btn'>" 
              + "<div id='goal-display-" + row.id + "' style='height:80px;width:100px;display:inline-block;margin-right:30px'></div>"
                + "<div style='display:inline-block'>"
                  + "<h2>" + row.name + "</h2>"
                  + "<p>" + row.date + "</p>"
                  + "<p><strong>Team:</strong> " + row.team + "</p>"
                + "</div>"
                
              + "</a>"
              + "<a href='#status-update' onclick='display_status_details("+row.id+")' class='ui-btn ui-btn-icon-notext ui-icon-plus'>Plus</a>" 
              + "</li>"
            );

            display_linegraph(row.id, 'mini');
          }
        }
      }, 
      function (transaction, err) {
        console.error(err);
      }
    );
  });
}

function display_linegraph(id, type){

  var data = new Array();

  db.transaction(function (transaction) {
    var sql = 'SELECT * FROM status' + id;
    transaction.executeSql(
      sql,
      undefined,
      function (transaction, result) {
        for (var i = 0; i < result.rows.length; i++) {
          var row = result.rows.item(i);
          var date_format = d3.time.format.iso.parse;
          console.log(row.date);
          console.log(date_format(row.date));
          data.push({
            date: date_format(row.date),
            progress: +row.progress
          });
        }
        display_linegraph_data(id, data, type);
      },
      function (transaction, err) {
        console.error(err);
      }
    );
  });
}

function display_linegraph_data(id, data, type) {

  console.log(id, data, type);

  if (type == 'mini'){
    var margin = {top: 10, right: 10, bottom: 20, left: 20},
      width = 100 - margin.left - margin.right,
      height = 80 - margin.top - margin.bottom;

    var x = d3.time.scale()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .ticks(0);

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .ticks(0);

    var line = d3.svg.line()
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y(d.progress); });

    var svg = d3.select("#goal-display-" + id).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    x.domain(d3.extent(data, function(d) { return d.date; }));
    y.domain(d3.extent(data, function(d) { return d.progress; }));

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)

    svg.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", line);
  }

}

/** ADD STATUS UPDATE **/

// display status details for new status update
function display_status_details(id) {

  db.transaction(function (transaction) {
    var sql = "SELECT * FROM goals WHERE id=" + id;
    transaction.executeSql(
      sql,
      undefined,
      function (transaction, result) {
        var item = result.rows.item(0);
        $('#update-goal-id').val(item.id);
        $('#update-goal-name').val(item.name);
        $('#update-date').val(new Date());
      },
      function (transaction, err) {
        console.error(err);
      }
    );
  });

}

// add new status update
$(document).on('tap', '#update-action', function () {

  var goal_id = $('#update-goal-id').val();
  var date = $('#update-date').val();
  var progress = $('#update-progress').val();
  var notes = $('#update-notes').val();

  if ((progress != "") && (notes != "")) {
    db.transaction(function (transaction) {
      var sql = "INSERT INTO status" + goal_id + " (date, progress, notes) VALUES (?, ?, ?)";
      transaction.executeSql(
        sql,
        [date, progress, notes],
        function (transaction, result) {
          $.mobile.changePage('#list-goals');
        },
        function (transaction, err) {
          console.error(err);
        }
      );
    });

  } else {
    alert('Please fill in all required fields!');
  }

});
