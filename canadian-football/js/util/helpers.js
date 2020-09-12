/**
 * @name util.helpers
 * @namespace Various utility functions that don't have anywhere else to go.
 */
define(["globals", "lib/jquery", "lib/knockout", "util/eventLog"], function(g, $, ko, eventLog) {
	"use strict";

	/**
	 * Validate that a given abbreviation corresponds to a team.
	 *
	 * If the abbreviation is not valid, then g.userTid and its correspodning abbreviation will be returned.
	 *
	 * @memberOf util.helpers
	 * @param  {string} abbrev Three-letter team abbreviation, like "ATL".
	 * @return {Array} Array with two elements, the team ID and the validated abbreviation.
	 */
	function validateAbbrev(abbrev) {
		var abbrevs, tid;

		tid = g.teamAbbrevsCache.indexOf(abbrev);

		if (tid < 0) {
			tid = g.userTid;
			abbrev = g.teamAbbrevsCache[tid];
		}

		return [tid, abbrev];
	}

	/**
	 * Validate that a given team ID corresponds to a team.
	 *
	 * If the team ID is not valid, then g.userTid and its correspodning abbreviation will be returned.
	 *
	 * @memberOf util.helpers
	 * @param {number|string} tid Integer team ID.
	 * @return {Array} Array with two elements, the validated team ID and the corresponding abbreviation.
	 */
	function validateTid(tid) {
		var abbrev;

		tid = parseInt(tid, 10);

		if (tid < 0 || tid >= g.teamAbbrevsCache.length || isNaN(tid)) {
			tid = g.userTid;
		}
		abbrev = g.teamAbbrevsCache[tid];

		return [tid, abbrev];
	}

	/**
	 * Get the team abbreviation for a team ID.
	 *
	 * For instance, team ID 0 is Atlanta, which has an abbreviation of ATL. This is a convenience wrapper around validateTid, excpet it will return "FA" if you pass g.PLAYER.FREE_AGENT.
	 *
	 * @memberOf util.helpers
	 * @param {number|string} tid Integer team ID.
	 * @return {string} Abbreviation
	 */
	function getAbbrev(tid) {
		var abbrev, result;

		if (tid === g.PLAYER.FREE_AGENT) {
			return "FA";
		}
		if (tid < 0) {
			// Draft prospect or retired
			return "";
		}
		result = validateTid(tid);
		tid = result[0];
		abbrev = result[1];

		return abbrev;
	}

	/**
	 * Validate the given season.
	 *
	 * Currently this doesn't really do anything except replace "undefined" with g.season.
	 *
	 * @memberOf util.helpers
	 * @param {number|string|undefined} season The year of the season to validate. If undefined, then g.season is used.
	 * @return {number} Validated season (same as input unless input is undefined, currently).
	 */
	function validateSeason(season) {
		if (!season) {
			return g.season;
		}

		season = Math.floor(season);

		if (isNaN(season)) {
			return g.season;
		}

		return season;
	}

	/**
	 * Get a list of all seasons that have been played so far, including the current one.
	 *
	 * @memberOf util.helpers
	 * @param {number=} selectedSeason If defined, then a season matching this year will have its "selected" property set to true.
	 * @param {number=} ignoredSeason If defined, then a season matching this year will not be present in the output. This is useful if you need a list of seasons that doesn't include the current season, for instance.
	 * @return {Array.<Object>} List of seasons. Each element in the list is an object with with two properties: "season" which contains the year, and "selectedSeason" which is a boolean for whether the year matched selectedSeason.
	 */
	function getSeasons(selectedSeason, ignoredSeason) {
		var season, seasons;

		selectedSeason = parseInt(selectedSeason, 10);
		ignoredSeason = ignoredSeason !== undefined ? parseInt(ignoredSeason, 10) : null;

		seasons = [];
		for ( season = g.startingSeason; season <= g.season; season++) {
			if (season !== ignoredSeason) {
				seasons.push({
					season : season,
					selected : selectedSeason === season
				});
			}
		}
		return seasons;
	}

	/**
	 * Get list of teams, along with some metadata
	 *
	 * Returns an array of all teams, sorted by tid. Each element contains an object with the following properties:
	 *     tid: Integer team ID (from 0 to the number of teams - 1, default 0 to 29).
	 *     region: String region name.
	 *     name: String team name.
	 *     abbrev: String 3-letter team abbreviation.
	 *     selected: If selectedTid is defined, this is a boolean representing whether this team is "selected" or not (see below).
	 *
	 * @memberOf util.helpers
	 * @param {number|string} selectedTid A team ID or abbrev for a team that should be "selected" (as in, from a drop down menu). This will add the "selected" key to each team object, as described above.
	 * @return {Array.Object} All teams.
	 */
	function getTeams(selectedTid) {
		var i, result, teams;

		selectedTid = selectedTid !== undefined ? selectedTid : -1;

		if ( typeof selectedTid === "string") {
			if (isNaN(parseInt(selectedTid, 10))) {
				// It's an abbrev, not a tid!
				result = validateAbbrev(selectedTid);
				selectedTid = result[0];
			}
		}

		teams = [];
		for ( i = 0; i < g.numTeams; i++) {
			teams[i] = {
				abbrev : g.teamAbbrevsCache[i],
				region : g.teamRegionsCache[i],
				name : g.teamNamesCache[i]
			};
		}

		if (selectedTid >= 0) {
			for ( i = 0; i < teams.length; i++) {
				teams[i].selected = false;
			}
			teams[selectedTid].selected = true;
		}

		return teams;
	}

	/**
	 * Take a list of teams (similar to the output of getTeamsDefault) and add popRank properties, where 1 is the largest population and teams.length is the smallest.
	 *
	 * @param {Array.<Object>} teams Teams without popRank properties.
	 * @return {Array.<Object>} Teams with added popRank properties.
	 */
	function addPopRank(teams) {
		var i, j, teamsSorted;

		// Add popRank
		teamsSorted = teams.slice();
		// Deep copy
		teamsSorted.sort(function(a, b) {
			return b.pop - a.pop;
		});
		for ( i = 0; i < teams.length; i++) {
			for ( j = 0; j < teamsSorted.length; j++) {
				if (teams[i].tid === teamsSorted[j].tid) {
					teams[i].popRank = j + 1;
					break;
				}
			}
		}

		return teams;
	}

	/**
	 * Get list of default teams, along with some more metadata
	 *
	 * Returns an array of default 30 teams. Each array is an object with the following properties:
	 *     tid: Integer team ID (0 to 29).
	 *     cid: Integer conference ID (0=East, 1=West).
	 *     did: Integer division ID.
	 *     region: String region name.
	 *     name: String team name.
	 *     abbrev: String 3-letter team abbreviation.
	 *     pop: From http://www.forbes.com/nba-valuations/ number of people in the region, in millions of people.
	 *     popRank: Rank of population, 1=largest, 30=smallest.
	 *     selected: If selectedTid is defined, this is a boolean representing whether this team is "selected" or not (see below).
	 *
	 * This should only be used to initialize things, since many of these values can change from their defaults.
	 *
	 * @memberOf util.helpers
	 * @param {number|string} selectedTid A team ID or abbrev for a team that should be "selected" (as in, from a drop down menu). This will add the "selected" key to each team object, as described above.
	 * @return {Array.<Object>} All teams.
	 */
	function getTeamsDefault() {
		var teams;

		teams = [{
			tid : 0,
			cid : 0,
			did : 0,
			region : "Hamilton",
			name : "Tiger Cats",
			abbrev : "HAM",
			pop : 9
		}, {
			tid : 1,
			cid : 0,
			did : 0,
			region : "Montreal",
			name : "Alouettes",
			abbrev : "MON",
			pop : 9
		}, {
			tid : 2,
			cid : 0,
			did : 0,
			region : "Ottawa",
			name : "Redblacks",
			abbrev : "OTT",
			pop : 2
		}, {
			tid : 3,
			cid : 0,
			did : 0,
			region : "Toronto",
			name : "Argonauts",
			abbrev : "TOR",
			pop : 8
		}, {
			tid : 4,
			cid : 0,
			did : 0,
			region : "Atlantic",
			name : "Schooners",
			abbrev : "ATL",
			pop : 4
		}, {
			tid : 5,
			cid : 1,
			did : 1,
			region : "BC",
			name : "Lions",
			abbrev : "BC",
			pop : 9
		}, {
			tid : 6,
			cid : 1,
			did : 1,
			region : "Calgary",
			name : "Stampeders",
			abbrev : "CAL",
			pop : 15
		}, {
			tid : 7,
			cid : 1,
			did : 1,
			region : "Edmonton",
			name : "Eskimos",
			abbrev : "EDM",
			pop : 12
		}, {
			tid : 8,
			cid : 1,
			did : 1,
			region : "Saskatchewan",
			name : "Roughriders",
			abbrev : "SAS",
			pop : 10
		}, {
			tid : 9,
			cid : 1,
			did : 1,
			region : "Winnipeg",
			name : "Blue Bombers",
			abbrev : "WIN",
			pop : 7
		}];

		teams = addPopRank(teams);

		return teams;
	}

	/**
	 * Clones an object.
	 *
	 * Taken from http://stackoverflow.com/a/3284324/786644
	 *
	 * @memberOf util.helpers
	 * @param {Object} obj Object to be cloned.
	 */
	function deepCopy(obj) {
		var key, retVal;

		if ( typeof obj !== "object" || obj === null) {
			return obj;
		}
		if (obj.constructor === RegExp) {
			return obj;
		}

		retVal = new obj.constructor();
		for (key in obj) {
			if (obj.hasOwnProperty(key)) {
				retVal[key] = deepCopy(obj[key]);
			}
		}
		return retVal;
	}

	/**
	 * Display a whole-page error message to the user.
	 *
	 * @memberOf util.helpers
	 * @param {Object} req Object with parameter "params" containing another object with a string representing the error message in the parameter "error".
	 */
	function globalError(req) {
		var data, ui, viewHelpers;

		ui = require("ui");
		viewHelpers = require("util/viewHelpers");

		viewHelpers.beforeNonLeague();

		ui.update({
			container : "content",
			template : "error"
		});
		ko.applyBindings({
			error : req.params.error
		}, document.getElementById("content"));
		ui.title("Error");
		req.raw.cb();
	}

	/**
	 * Display a whole-page error message to the user, while retaining the league menu.
	 *
	 * @memberOf util.helpers
	 * @param {Object} req Object with parameter "params" containing another object with a string representing the error message in the parameter "error" and an integer league ID in "lid".
	 */
	function leagueError(req) {
		var ui, viewHelpers;

		ui = require("ui");
		viewHelpers = require("util/viewHelpers");

		viewHelpers.beforeLeague(req, function() {
			ui.update({
				container : "league_content",
				template : "error"
			});
			ko.applyBindings({
				error : req.params.error
			}, document.getElementById("league_content"));
			ui.title("Error");
			req.raw.cb();
		});
	}

	/**
	 * Display a whole-page error message to the user by calling either leagueError or globalError as appropriate.
	 *
	 * Use errorNotify for minor errors.
	 *
	 * @memberOf util.helpers
	 * @param {string} error Text of the error message to be displayed.
	 * @param {function()} cb Optional callback function.
	 *  @param {boolean} forceGlobal If true, always call globalError (needed if league/global distinction can't be inferred from URL).
	 */
	function error(errorText, cb, forceGlobal) {
		var lid, req;

		forceGlobal = forceGlobal !== undefined ? forceGlobal : false;

		req = {
			params : {
				error : errorText
			},
			raw : {
				cb : cb !== undefined ? cb : function() {
				}
			}
		};

		lid = location.pathname.split("/")[2];
		// lid derived from URL
		if (/^\d+$/.test(lid) && typeof indexedDB !== "undefined" && !forceGlobal) {// Show global error of no IndexedDB
			req.params.lid = parseInt(lid, 10);
			leagueError(req);
		} else {
			globalError(req);
		}
	}

	/**
	 * Display a transient error message as a notification popup.
	 *
	 * Use error if you need to block the whole page.
	 *
	 * @memberOf util.helpers
	 * @param {string} error Text of the error message to be displayed.
	 */
	function errorNotify(errorText) {
		eventLog.add(null, {
			type : "error",
			text : errorText,
			saveToDb : false
		});
	}

	/**
	 * Delete all the things from the global variable g that are not stored in league databases.
	 *
	 * This is used to clear out values from other leagues, to ensure that the appropriate values are updated in the database when calling db.setGameAttributes.
	 *
	 * @memberOf util.helpers
	 */
	function resetG() {
		var key;

		for (key in g) {
			if (g.hasOwnProperty(key) && g.notInDb.indexOf(key) < 0) {
				delete g[key];
			}
		}
	}

	/**
	 * Ping a counter at basketball-gm.com.
	 *
	 * This should only do something if it isn't being run from a unit test and it's actually on basketball-gm.com.
	 *
	 * @memberOf util.helpers
	 * @param {string} type Either "league" for a new league, or "season" for a completed season
	 */
	function bbgmPing(type) {
		if (g.enableLogging) {
			if (type === "league") {
				_gaq.push(["_trackEvent", "Canadian Football", "New league", g.lid.toString()]);
			} else if (type === "season") {
				_gaq.push(["_trackEvent", "Canadian Football", "Completed season", g.season.toString()]);
			}
		}
	}

	/**
	 * Generate a block of HTML with a player's skill labels.
	 *
	 * @memberOf util.helpers
	 * @param {Array.<string>} skills Array of skill labels, like "R" for "Rebounder", etc. See: core.player.skills.
	 * @return {string} String of HTML-formatted skill labels, ready for output.
	 */
	function skillsBlock(skills) {
		var i, skillsHtml, tooltips;

		tooltips = {

			Pp : "Passing - Precision",
			Pd : "Passing - Deep",
			Pe : "Passing - Evasiveness",
			RuP : "Rushing - Power",
			RuF : "Rushing - Finesse",
			ReS : "Receiving - Short",
			ReC : "Receiving - Medium/Crossing",
			ReD : "Receiving - Deep",
			Bp : "Blocking - Passing",
			Br : "Blocking - Rushing",
			Sa : "Sack/Pass Rush",
			Rs : "Run Stopping",
			Cs : "Coverage - Short",
			Cc : "Coverage - Medium/Crossing",
			Cd : "Coverage - Deep",
			Fg : "Field Goal",
			P : "Punting",
			K : "Kick Off"

			/*            "3": "Three Point Shooter",
			 A: "Athlete",
			 B: "Ball Handler",
			 Di: "Interior Defender",
			 Dp: "Perimeter Defender",
			 Po: "Post Scorer",
			 Ps: "Passer",
			 R: "Rebounder" */
		};

		skillsHtml = '';
		if (skills !== undefined) {
			for ( i = 0; i < skills.length; i++) {
				skillsHtml += '<span class="skill" title="' + tooltips[skills[i]] + '">' + skills[i] + '</span>';
			}
		}

		return skillsHtml;
	}

	/**
	 * Create a URL for a page within a league.
	 *
	 * This will also maintain any query string on the end of the URL, for instance for popup windows, unless options.noQueryString is set. Ignoring the query string can be important for forms in Davis.js until this is fixed: https://github.com/olivernn/davis.js/issues/75
	 *
	 * @param {Array.<string|number>} components Array of components for the URL after the league ID, which will be combined with / in between.
	 * @param {object|number?} lid League ID number, either a number or a knockout observable. If not passed, then g.lid is used. This is needed to make some observables (navbar) depend on the lid.
	 * @return {string} URL
	 */
	function leagueUrl(components, options, lid) {
		var i, url;

		options = options !== undefined ? options : {};
		lid = lid !== undefined ? ko.utils.unwrapObservable(lid) : g.lid;

		url = "/l/" + lid;
		for ( i = 0; i < components.length; i++) {
			if (components[i] !== undefined) {
				url += "/" + ko.utils.unwrapObservable(components[i]);
			}
		}
		if (!options.noQueryString) {
			url += location.search;
		}

		return url;
	}

	function watchBlock(pid, watch) {
		if (watch) {
			return '<span class="glyphicon glyphicon-flag watch watch-active" title="Remove from Watch List" data-pid="' + pid + '"></span>';
		} else {
			return '<span class="glyphicon glyphicon-flag watch" title="Add to Watch List" data-pid="' + pid + '"></span>';
		}
	}

	/**
	 * Generate a block of HTML with a player's name, skill labels.
	 *
	 * @memberOf util.helpers
	 * @param {number} pid Player ID number.
	 * @param {string} name Player name.
	 * @param {object=} object Injury object (properties: type and gamesRemaining).
	 * @param {Array.<string>=} skills Array of skill labels, like "R" for "Rebounder", etc. See: core.player.skills.
	 * @param {Array.<string>=} skills True: player is on watch list. False: player is not on watch list. Undefined: not sure, so don't show watch icon.
	 * @return {string} String of HTML-formatted skill labels, ready for output.
	 */
	function playerNameLabels(pid, name, injury, skills, watch) {
		var html;

		html = '<a href="' + leagueUrl(["player", pid]) + '">' + name + '</a>';

		if (injury !== undefined) {
			if (injury.gamesRemaining > 0) {
				html += '<span class="label label-danger label-injury" title="' + injury.type + ' (out ' + injury.gamesRemaining + ' more games)">' + injury.gamesRemaining + '</span>';
			} else if (injury.gamesRemaining === -1) {
				// This is used in box scores, where it would be confusing to display "out X more games" in old box scores
				html += '<span class="label label-danger label-injury" title="' + injury.type + '">&nbsp;</span>';
			}
		}

		if (skills !== undefined) {
			html += skillsBlock(skills);
		}

		if (watch !== undefined) {
			html += watchBlock(pid, watch);
		}

		return html;
	}

	/**
	 * Round a number to a certain number of decimal places.
	 *
	 * @memberOf util.helpers
	 * @param {number|string} value Number to round.
	 * @param {number=} precision Number of decimal places. Default is 0 (round to integer).
	 * @return {string} Rounded number.
	 */
	function round(value, precision) {
		precision = precision !== undefined ? parseInt(precision, 10) : 0;

		return parseFloat(value).toFixed(precision);
	}

	/**
	 * Pad an array with nulls or truncate it so that it has a fixed length.
	 *
	 * @memberOf util.helpers
	 * @param {Array} array Input array.
	 * @param {number} length Desired length.
	 * @return {Array} Original array padded with null or truncated so that it has the required length.
	 */
	function nullPad(array, length) {
		if (array.length > length) {
			return array.slice(0, length);
		}

		while (array.length < length) {
			array.push(null);
		}

		return array;
	}

	/**
	 * Format a number as currency, correctly handling negative values.
	 *
	 * @memberOf util.helpers
	 * @param {number|string} amount Input value.
	 * @param {string=} append Suffix to append to the number, like "M" for things like $2M.
	 * @param {number|string|undefined} precision Number of decimal places. Default is 2 (like $17.62).
	 * @return {string} Formatted currency string.
	 */
	function formatCurrency(amount, append, precision) {
		append = typeof append === "string" ? append : "";
		precision = typeof precision === "number" || typeof precision === "string" ? precision : 2;

		if (amount < 0) {
			return "-$" + round(Math.abs(amount), precision) + append;
		}
		return "$" + round(amount, precision) + append;
	}

	/**
	 * Format a number with commas in the thousands places.
	 *
	 * Also, rounds the number first.
	 *
	 * @memberOf util.helpers
	 * @param {number|string} x Input number.
	 * @return {string} Formatted number.
	 */
	function numberWithCommas(x) {
		x = round(x);
		return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	}

	/**
	 * Bound a number so that it can't exceed min and max values.
	 *
	 * @memberOf util.helpers
	 * @param {number} x Input number.
	 * @param {number} min Minimum bounding variable.
	 * @param {number} max Maximum bounding variable.
	 * @return {number} Bounded number.
	 */
	function bound(x, min, max) {
		if (x < min) {
			return min;
		}
		if (x > max) {
			return max;
		}
		return x;
	}

	/**
	 * Link to an abbrev either as "ATL" or "ATL (from BOS)" if a pick was traded.
	 *
	 * @memberOf util.helpers
	 * @param {string} abbrev Drafting team ID.
	 * @param {string} originalTid Original owner of the pick team ID.
	 * @param {season=} season Optional season for the roster links.
	 * @return {string} HTML link(s).
	 */
	function draftAbbrev(tid, originalTid, season) {
		var abbrev, originalAbbrev;

		abbrev = g.teamAbbrevsCache[tid];
		originalAbbrev = g.teamAbbrevsCache[originalTid];

		if (abbrev === originalAbbrev) {
			return '<a href="' + leagueUrl(["roster", abbrev, season]) + '">' + abbrev + '</a>';
		}

		return '<a href="' + leagueUrl(["roster", abbrev, season]) + '">' + abbrev + '</a> (from <a href="' + leagueUrl(["roster", originalAbbrev, season]) + '">' + originalAbbrev + '</a>)';
	}

	function pickDesc(pick) {
		var desc;

		if (pick.round < 3) {
			desc = pick.season + " " + (pick.round === 1 ? "first" : "second") + " round pick";
		} else if (pick.round < 5) {
			desc = pick.season + " " + (pick.round === 3 ? "third" : "fourth") + " round pick";
		} else {
			desc = pick.season + " " + "fifth" + " round pick";
		}
		if (pick.tid !== pick.originalTid) {
			desc += " (from " + g.teamAbbrevsCache[pick.originalTid] + ")";
		}

		return desc;
	}

	function ordinal(x) {
		var suffix;

		if (x >= 11 && x <= 13) {
			suffix = "th";
		} else if (x % 10 === 1) {
			suffix = "st";
		} else if (x % 10 === 2) {
			suffix = "nd";
		} else if (x % 10 === 3) {
			suffix = "rd";
		} else {
			suffix = "th";
		}

		return x.toString() + suffix;
	}

	/**
	 * Generate a game log list.
	 *
	 * @memberOf helpers
	 * @param {string} abbrev Abbrev of the team for the list of games.
	 * @param {number} season Season for the list of games.
	 * @param {number} gid Integer game ID for the box score (a negative number means no box score), which is used only for highlighting the relevant entry in the list.
	 * @param {Array.<Object>} gid Array of already-loaded games. If this is not empty, then only new games that are not already in this array will be passed to the callback.
	 * @param {function(Array.<Object>)} cb Callback whose argument is a list of game objects.
	 */
	function gameLogList(abbrev, season, gid, loadedGames, cb) {
		var games, maxGid, out, tid;

		out = validateAbbrev(abbrev);
		tid = out[0];
		abbrev = out[1];

		if (loadedGames.length > 0) {
			maxGid = loadedGames[0].gid;
			// Load new games
		} else {
			maxGid = -1;
			// Load all games
		}

		games = [];
		// This could be made much faster by using a compound index to search for season + team, but that's not supported by IE 10
		g.dbl.transaction("games").objectStore("games").index("season").openCursor(season, "prev").onsuccess = function(event) {
			var cursor, game, i, overtime;

			cursor = event.target.result;
			if (cursor && cursor.value.gid > maxGid) {
				game = cursor.value;

				if (game.overtimes === 1) {
					overtime = " (OT)";
				} else if (game.overtimes > 1) {
					overtime = " (" + game.overtimes + "OT)";
				} else {
					overtime = "";
				}

				// Check tid
				if (game.teams[0].tid === tid || game.teams[1].tid === tid) {
					games.push({
						gid : game.gid,
						tid : tid,
						selected : game.gid === gid,
						overtime : overtime
					});

					i = games.length - 1;
					if (game.teams[0].tid === tid) {
						games[i].home = true;
						games[i].pts = game.teams[0].pts;
						games[i].oppPts = game.teams[1].pts;
						games[i].oppTid = game.teams[1].tid;
						games[i].oppAbbrev = g.teamAbbrevsCache[game.teams[1].tid];
						games[i].won = game.teams[0].pts > game.teams[1].pts;
					} else if (game.teams[1].tid === tid) {
						games[i].home = false;
						games[i].pts = game.teams[1].pts;
						games[i].oppPts = game.teams[0].pts;
						games[i].oppTid = game.teams[0].tid;
						games[i].oppAbbrev = g.teamAbbrevsCache[game.teams[0].tid];
						games[i].won = game.teams[1].pts > game.teams[0].pts;
					}
				}

				cursor.continue();
			} else {
				cb(games);
			}
		};
	}

	function formatCompletedGame(game) {
		var output, team0, team1;
		// If not specified, assume user's team is playing
		game.tid = game.tid !== undefined ? game.tid : g.userTid;

		// team0 and team1 are different than they are above! Here it refers to user and opponent, not home and away
		team0 = {
			tid : game.tid,
			abbrev : g.teamAbbrevsCache[game.tid],
			region : g.teamRegionsCache[game.tid],
			name : g.teamNamesCache[game.tid],
			pts : game.pts
		};
		team1 = {
			tid : game.oppTid,
			abbrev : g.teamAbbrevsCache[game.oppTid],
			region : g.teamRegionsCache[game.oppTid],
			name : g.teamNamesCache[game.oppTid],
			pts : game.oppPts
		};

		output = {
			gid : game.gid,
			overtime : game.overtime,
			won : game.won
		};
		if (game.home) {
			output.teams = [team1, team0];
		} else {
			output.teams = [team0, team1];
		}
		if (game.won) {
			output.score = team0.pts + "-" + team1.pts;
		} else {
			output.score = team1.pts + "-" + team0.pts;
		}

		return output;
	}

	// Calculate the number of games that team is behind team0
	function gb(team0, team) {
		return ((team0.won - team0.lost) - (team.won - team.lost)) / 2;
	}

	return {
		validateAbbrev : validateAbbrev,
		getAbbrev : getAbbrev,
		validateTid : validateTid,
		validateSeason : validateSeason,
		getSeasons : getSeasons,
		getTeams : getTeams,
		addPopRank : addPopRank,
		getTeamsDefault : getTeamsDefault,
		deepCopy : deepCopy,
		error : error,
		errorNotify : errorNotify,
		resetG : resetG,
		bbgmPing : bbgmPing,
		skillsBlock : skillsBlock,
		watchBlock : watchBlock,
		playerNameLabels : playerNameLabels,
		round : round,
		nullPad : nullPad,
		formatCurrency : formatCurrency,
		numberWithCommas : numberWithCommas,
		bound : bound,
		leagueUrl : leagueUrl,
		draftAbbrev : draftAbbrev,
		pickDesc : pickDesc,
		ordinal : ordinal,
		gameLogList : gameLogList,
		formatCompletedGame : formatCompletedGame,
		gb : gb
	};
});