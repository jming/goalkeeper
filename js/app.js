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
    + "team VARCHAR(100) NOT NULL, "
    + "team_string TEXT NOT NULL, "
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

// caregivers database
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

// statustypes database
db.transaction (function (transaction) {
  var sql = 'CREATE TABLE IF NOT EXISTS statustypes'
    + " (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,"
    + " name VARCHAR(250) NOT NULL,"
    + " freq VARCHAR(10) NOT NULL,"
    + " type VARCHAR(10) NOT NULL,"
    + " range1a INTEGER,"
    + " range1b INTEGER,"
    + " trigger INTEGER,"
    + " notes TEXT)"
  transaction.executeSql(
    sql,
    undefined,
    function () {},
    function (transaction, err) {
      console.error(err);
    }
  );
})

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
      function () {},
      function (transaction, err) {
        console.error(err);
      }
    );
  });

  db.transaction(function (transaction) {
    var sql = 'DROP TABLE statustypes';
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

    // create team_string
    var team_string = ""

    db.transaction(function (transaction) {
      var sql = 'SELECT * FROM caregivers WHERE id=' + team_checked.attr('id').replace('cg-', '');
      for (var n=1; n<team_checked.length; n++) {
        sql += ' OR id=' + $(team_checked[n]).attr('id').replace('cg-','');
      }
      console.log('team_string sql', sql);
      transaction.executeSql(
        sql,
        undefined,
        function (transaction, result) {
          for (var i = 0; i < result.rows.length; i++) {
            var row = result.rows.item(i)
            team_string += row.name + ", "
          }
          team_string.slice(0, -2)
        },
        function (transaction, err) {
          console.error(err);
        }
      );
    });

    // add to databasae
    db.transaction(function (transaction) {
      var sql = "INSERT INTO goals (name, date, team, team_string, notes) VALUES (?, ?, ?, ?, ?)";
      transaction.executeSql(
        sql,
        [goal_name, new Date(), team, team_string, goal_notes],
        function (transaction, result) {
          goal_id = result.insertId;
        },
        function (transaction, err) {
          console.error(err);
        }
      );
    });

    db.transaction(function (transaction) {
      var sql = 'DROP TABLE IF EXISTS status' + goal_id;
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
            // console.log(sql);
            transaction.executeSql(
              sql, 
              undefined, 
              function () {
                console.log('status'+ goal_id + ' table created!');
              }, 
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
        console.error(err);
      }
    );
  });
}

/** STATUS TYPES **/
// add input type

$(document).ready(function () {
  $('#sc-type').change(function() {

    var selected = $('#sc-type option:selected').val()
    // console.log('sc-type change');
    if (selected == 'number') {
      $('#sc-number').css('display', 'block');
    }
    if (selected == 'text') {
      $('#sc-number').css('display', 'none')
    }

  });
});

$(document).on('tap', '#add-status-choice-action', function () {

  var name = $('#sc-name').val();
  var freq = $('#sc-freq input:selected').val();
  var type = $('#sc-type input:selected').val();
  var range1a = $('#sc-range-1a').val();
  var range1b = $('#sc-range-1b').val();
  var trigger = $('#sc-trigger').val();
  var notes = $('#sc-notes').val();

  if ((name != '') && (trigger < range1b)){

    db.transaction(function (transaction) {
      var sql = 'INSERT INTO statustypes (name, freq, type, range1a, range1b, trigger, notes) VALUES (?, ?, ?, ?, ?, ?, ?)';
      transaction.executeSql(
        sql,
        [name, freq, type, range1a, range1b, trigger, notes],
        function (transaction, result) {
          var i = result.insertId;

          $('#sc-name').val('');
          $('#sc-range-1a').val(0);
          $('#sc-range-1b').val(100);
          $('#sc-trigger').val(50);
          $('#sc-notes').val('');

          $("#sc-freq").val('daily').attr('selected', true).siblings('option').removeAttr('selected');
          $("#sc-type").val('text').attr('selected', true).siblings('option').removeAttr('selected');

          $('#sc-number').css('display', 'none');

          display_status_types();

          setTimeout(function() {
            $('#sc-' + i).prop('checked', true).checkboxradio('refresh');
          }, 100);
        },
        function (transaction, err) {
          console.error(err);
        }
      );
    });
  } else  if (trigger > range1b) {
    alert('Trigger threshold cannot be larger than range. Please fix and submit again.')
  }
  else {
    alert('Please fill out required values!');
  }

});

function display_status_types() {
  db.transaction(function (transaction) {
    var sql = 'SELECT * FROM statustypes';
    transaction.executeSql(
      sql,
      undefined,
      function (transaction, result) {
        if (result.rows.length) {
          $('#no-sc').css('display', 'none');
          var sc_displayed = $('#update-choices-div input').length;
          for (var i=sc_displayed; i < result.rows.length; i++) {
            var row = result.rows.item(i);
            var scid = 'sc-' + row.id;
            $('#update-choices-div').append(
              "<input type='checkbox' name='" + scid + "' id='" + scid + "' />"
              + "<label for='" + scid + "'>" + row.name + "</label>"
            ).trigger('create');
          }
        }
      },
      function (transaction, err) {
        console.error(err);
      }
    );
  })
}

/** DISPLAY GOALS **/ 
$(document).on('pageshow', '#list-goals', function () {

  display_goals(DEFAULT_SORT);

  $('#sort-goals').change(function() {

    var selected = $('#sort-goals option:selected').val();

    display_goals(selected);
  });

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
              + "<a href='#goal-detail' onclick='set_details("+row.id+")' class='ui-btn'>" 
              + "<div id='goal-display-" + row.id + "' style='height:80px;width:100px;display:inline-block;margin-right:30px'></div>"
                + "<div style='display:inline-block'>"
                  + "<h2>" + row.name + "</h2>"
                  + "<p>" + row.date + "</p>"
                  + "<p><strong>Team:</strong> " + row.team_string + "</p>"
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

  if (type == 'large') {
    $("#goal-info-statuses").empty();
    $('#goal-info-chart').empty();
  }

  db.transaction(function (transaction) {
    var sql = 'SELECT * FROM status' + id;
    transaction.executeSql(
      sql,
      undefined,
      function (transaction, result) {
        for (var i = 0; i < result.rows.length; i++) {
          var row = result.rows.item(i);
          var date_format = d3.time.format.iso.parse;
          // var new_date_format = d3.time.format('%m-%d-%Y');
          // console.log(row.date);
          // console.log(date_format(row.date));
          data.push({
            date: date_format(row.date),
            progress: +row.progress
          });

          if (type == 'large') {
            // add in the list

            $('#goal-info-statuses').append(
              "<li data-icon='info'>" 
                + "<a href='#goal-info-status-notes' class='ui-btn'>" + row.date + "</a>"
              + "</li>"
              // + "<div id='goal-info-status-notes' data-role='popup'>"
              //   + "<div data-role='fieldcontain'>"
              //     + "<label for='update-notes'>Notes:</label>"
              //     + "<textarea name='update-notes' id='update-notes'>" 
              //       + row.notes
              //     + "</textarea>"
              //   + "</div>"
              // + "</div>"
            );
          }
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

  // console.log(id, data, type);

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
  if (type == 'large') {
    var margin = {top: 20, right: 20, bottom: 30, left: 30},
      width = 400 - margin.left - margin.right,
      height = 300 - margin.top - margin.bottom;

    var x = d3.time.scale()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")

    var line = d3.svg.line()
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y(d.progress); });

    var svg = d3.select("#goal-info-chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    x.domain(d3.extent(data, function(d) { return d.date; }));
    y.domain(d3.extent(data, function(d) { return d.progress; }));

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
      .append('text')
        .attr('class', 'label')
        .attr('x', width)
        .attr('y', -6)
        .style("text-anchor", "end")
        .text('Time');

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
     .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Progress");

    svg.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", line);
  }

}

/** DISPLAY GOAL DETAILS **/
function set_details(id) {

  // get basic info
  db.transaction(function (transaction) {
    var sql = 'SELECT * FROM goals WHERE id=' + id;
    transaction.executeSql(
      sql,
      undefined,
      function (transaction, result) {
        var item = result.rows.item(0);
        $('#goal-info-name').text(item.name);
        $('#goal-info-id').text(item.id);
        $('#goal-info-team').text("Team: " + item.team_string);
        $('#goal-info-notes').val(item.notes);
      },
      function (transaction, err) {
        console.error(err);
      }
    );
  })

  // get status info

  display_linegraph(id, 'large');
}

$(document).on('tap', '#goal-info-add-status', function() {
  display_status_details($('#goal-info-id').text())
});

// edit notes

// put text of notes to edit
$(document).on('tap', '#edit-notes-button', function() {
  $('#edit-notes-field').val($('#goal-info-notes').val());
});

// save edit notes
$(document).on('tap', '#edit-notes-save', function() {
  var cid = $('#goal-info-id').text();
  var notesval = $('#edit-notes-field').val();
  db.transaction(function (transaction) {
    var sql = "UPDATE goals SET notes='" + notesval + "' WHERE id='" + cid + "'";
    console.log(sql);
    transaction.executeSql(
      sql, 
      undefined, 
      function () {}, 
      function (transaction, error) {
        console.error("error: " + error.message);
      }
    );
  });
  $('#goal-info-notes').val(notesval);
});

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

          // clear things out
          $('#update-goal-id').val('');
          $('#update-date').val('');
          $('#update-progress').val('');
          $('#update-notes').val('');

          display_goals(DEFAULT_SORT);
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
