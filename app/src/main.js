/*globals define*/
define(function (require, exports, module) {
      'use strict';
      // import dependencies
      var Engine = require('famous/core/Engine');
      var Surface = require('famous/core/Surface');
      var Transform = require('famous/core/Transform');
      var RenderNode = require('famous/core/RenderNode');
      var StateModifier = require('famous/modifiers/StateModifier');
      var ScrollView = require('famous/views/ScrollView');
      var Easing = require('famous/transitions/Easing');
      var Transitionable = require('famous/transitions/Transitionable');
      var SnapTransition = require('famous/transitions/SnapTransition');
      var Timer = require('famous/utilities/Timer');

      //var TwineTransition = require('famous/transitions/TwineTransition');
      var tile_animation = {
        method: 'snap',
        period: 148,
        dampingRatio: 0.44
      };
      var board_animation = {
        method: 'snap',
        period: 600,
        dampingRatio: 0.62
      };
      Transitionable.registerMethod('snap', SnapTransition);
      function Game(sides, engine, ctx) {
        // app config
        this.sides = sides;
        this.engine = engine;
        this.ctx = ctx;
        this.init();
      }

      Game.prototype.init = function () {
        this.tiles = {};
        this.dimensions();
        this.node_list = [];
        this.nodes = new ScrollView({direction: 1});
        this.boardNode = new RenderNode(new StateModifier());
        this.ctx.add(new StateModifier({transform: Transform.translate(this.margin_left, 0)})).add(this.nodes);
        this.header();
        this.bindEvents();
        this.board_back = new BoardBack(this);
        this.board_back.tiles();

        var state = this.retrieve('state');
        if (state) {
          for (var tile_coord_id in state) {
            if (state.hasOwnProperty(tile_coord_id)) {
              var matched = this.invCoordID(tile_coord_id);
              this.newTile(matched[1], matched[2], state[tile_coord_id]);
            }
          }

        } else {
          this.start();
        }

        this.addNode(this.boardNode);

        this.footer();
        var full_bg = new Surface();
        var full_bg_modifier = new StateModifier({transform: Transform.translate(0, 0, -1)});
        full_bg.pipe(this.nodes);
        this.ctx.add(full_bg_modifier).add(full_bg);
        this.nodes.sequenceFrom(this.node_list);

        var score = this.retrieve('score');
        if (score) {
          this.score = score;
        } else {
          this.score = {highest: 0, current: 0}
        }
        var self = this;
        Timer.setTimeout(function () {
          self.updateScore();
        }, 200)


      };

      Game.prototype.addNode = function (node) {
        this.node_list.push(node);
        if (node instanceof Surface) {
          node.pipe(this.nodes)
        }
      };

      Game.prototype.updateScore = function () {
        this.score.highest = Math.max(this.score.highest, this.score.current);
        document.querySelector('.score-container').innerHTML = this.score.current;
        document.querySelector('.best-container').innerHTML = this.score.highest;
      };
      Game.prototype.header = function () {
        var node = new RenderNode(new StateModifier({ transform: Transform.translate(0, 80)}));
        var surf = new Surface({
              size: [this.center_width, 250],
              content: (
                  '<div class="heading">' +
                      '<h1 class="title">2048</h1>' +
                      '<div class="scores-container">' +
                      '<div class="score-container"><div class="score-addition"></div></div>' +
                      '<div class="best-container"></div>' +
                      '</div>' +
                      '</div>' +
                      '<div class="above-game">' +
                      '<p class="game-intro">Join the numbers and get to the <strong>2048 tile!</strong></p>' +
                      '<a class="restart-button">New Game</a>' +
                      '</div>'
                  )
            }
        );
        node.add(surf);
        surf.pipe(this.nodes);
        this.addNode(node);
        var self = this;
        Timer.setTimeout(function () {
          document.querySelector('.restart-button').click(function () {
            self.restart();
          })
        }, 200);

      };
      Game.prototype.footer = function () {
        var node = new RenderNode(new StateModifier({}));
        var surf = new Surface({
              size: [this.center_width, 290],
              content: (
                  [('<p class="game-explanation">' +
                      '<strong class="important">How to play:</strong> Use your <strong>arrow keys</strong> to move the tiles. When two tiles with the same number touch, they <strong>merge into one!</strong>' +
                      '</p>'),

                    ('<p>' +
                        'This implementation of 2048 has been achieved using the Famo.us framework. Check out their website <a href="http://famo.us">here.</a>' +
                        '</p>'),
                    ('<p>' +
                        'Created by <a href="http://relfor.co" target="_blank">Relfor.</a> Based on <a href="http://git.io/2048">2048 by Gabriele Cirulli</a> (which is based on <a href="https://itunes.apple.com/us/app/1024!/id823499224" target="_blank">1024 by Veewo Studio</a> and conceptually similar to <a href="http://asherv.com/threes/" target="_blank">Threes by Asher Vollmer.</a>)' +
                        '</p>')].join("<hr>")
                  )
            }
        );
        node.add(surf);
        surf.pipe(this.nodes);
        this.addNode(node);

      };
      /**
       * Return true if the dimensions have changed
       */
      Game.prototype.dimensions = function () {
        var prev_navigator = this.navigator;
        if (this.ctx.getSize()[0] > 520) {
          this.navigator = 'desktop';
          this.tile_size = 106.25;
          this.padding = 15;
        } else {
          this.navigator = 'mobile';
          this.tile_size = 57.5;
          this.padding = 10;
        }
        this.center_width = ((this.tile_size + this.padding) * (this.sides)) + this.padding;
        this.margin_left = (this.ctx.getSize()[0] - this.center_width) / 2;

        return prev_navigator !== this.navigator;

      };
      Game.prototype.bindEvents = function () {
        if (this.binded) return;
        this.binded = true;
        var self = this;
        this.engine.on('keydown', function (e) {
          var map = {
            38: 0, // Up
            39: 1, // Right
            40: 2, // Down
            37: 3, // Left
            75: 0, // Vim up
            76: 1, // Vim right
            74: 2, // Vim down
            72: 3, // Vim left
            87: 0, // W
            68: 1, // D
            83: 2, // S
            65: 3, // A
            82: 4  // restart
          };
          if (map[e.which] !== undefined && !e.metaKey && !e.ctrlKey) {
            self.action(map[e.which]);
          }
        });
        // bind events on the board
        this.engine.on('resize', function () {
          self.dimensions() && self.rerender();
        });

      };
      Game.prototype.store = function (k, v) {
        localStorage && localStorage.setItem(k, JSON.stringify(v));
      };
      Game.prototype.unstore = function (k) {
        localStorage && localStorage.removeItem('tiles');
      };
      Game.prototype.retrieve = function (k) {
        var item = localStorage && localStorage.getItem(k);
        return item ? JSON.parse(item) : null;

      };
      Game.prototype.changeTiles = function (directive) {
        for (var tile_coord_id in this.tiles) {
          if (this.tiles.hasOwnProperty(tile_coord_id)) {
            this.tiles[tile_coord_id] && this.tiles[tile_coord_id][directive]();
            delete this.tiles[tile_coord_id];
          }
        }
      };
      Game.prototype.rerender = function () {
        this.board_back.rerender();
        this.changeTiles('rerender');
      };
      Game.prototype.save = function () {
        var state = {};
        for (var tile_coord_id in this.tiles) {
          if (this.tiles.hasOwnProperty(tile_coord_id)) {
            if (this.tiles[tile_coord_id]) {
              state[tile_coord_id] = this.tiles[tile_coord_id].v
            }
          }
        }
        this.store('state', state);
        this.store('score', this.score);
      };


      /**
       * Lookup identifier for coordinates
       */
      Game.prototype.coordID = function (i, j) {
        return i + ":" + j;
      };
      Game.prototype.invCoordID = function (coord_id) {
        return coord_id.match(/(\d+):(\d+)/);

      };
      Game.prototype.randomCoord = function () {
        return Math.floor(Math.random() * this.sides);
      };
      Game.prototype.spawn = function () {
        // pre condition: game is not over (checked with Game.over())
        while (true) {
          var i = this.randomCoord();
          var j = this.randomCoord();
          if (!this.tiles[this.coordID(i, j)]) {
            this.newTile(i, j, Math.random() < 0.9 ? 2 : 4);
            break;
          }
        }
      };


      Game.prototype.restart = function () {
        // destroy all surfaces
        this.changeTiles('destroy');
        this.unstore('state');
        this.unstore('score');
        this.score = {highest: this.score.highest, current: 0};
        this.store('score', this.score);
        this.updateScore();
        this.start();
      };
      Game.prototype.start = function () {
        this.spawn();
        this.spawn();
      };


      Game.prototype.win = function () {
        alert('you win');
      };
      Game.prototype.loose = function () {
        alert('you lost');
      };

      Game.prototype.moveTile = function (cur, to) {
        var tile = this.tiles[this.coordID(cur[0], cur[1])];
        tile.move(to[0], to[1]);
        this.tiles[this.coordID(to[0], to[1])] = tile;
        this.tiles[this.coordID(cur[0], cur[1])] = null;
      };

      Game.prototype.hop = function (direction, cur_i, cur_j) {
        var i = cur_i;
        var j = cur_j;
        var end = false;
        var v = this.tiles[this.coordID(i, j)].v;
        var hops = 0;
        while (!end) {
          var prev_i = i;
          var prev_j = j;
          var moved = this.next(direction, i, j);
          end = !moved;
          if (end) {
            if (!hops) {
              return 0; //we reached the end without any hops
            }
          } else {
            i = moved[0];
            j = moved[1];
          }
          var tile_in_position = this.tiles[this.coordID(i, j)];
          if (tile_in_position) {
            if (tile_in_position.v !== v) {
              hops && this.moveTile([cur_i, cur_j], [prev_i, prev_j]);
              return hops;
            } else {
              this.mergeTiles([cur_i, cur_j], [i, j]);
              return true;
            }
          } else if (end) {
            this.moveTile([cur_i, cur_j], [i, j]);
            return hops;
          }
          hops++;

        }

      };
      Game.prototype.over = function () {
        var row, col, prev_row, prev_col;
        for (var i = 0; i < this.sides; i++) {
          prev_row = prev_col = undefined;
          for (var j = 0; j < this.sides; j++) {
            row = this.tiles[this.coordID(i, j)];
            col = this.tiles[this.coordID(j, i)];
            if (!row || !col || (row && prev_col && row.v === prev_row.v) || (col && prev_col && col.v === prev_col.v)) {
              return false;
            }
            prev_row = row;
            prev_col = col;
          }
        }
        return true;
      };

      /**
       * Logging the state of the game in the console for
       * debugging purposes
       */
      Game.prototype.log = function () {
        for (var j = 0; j < this.sides; j++) {
          var row = "";
          for (var i = 0; i < this.sides; i++) {
            row += (this.tiles[this.coordID(i, j)] ? this.tiles[this.coordID(i, j)].v : "0") + " ";
          }
        }
      };
      Game.prototype.next = function (direction, i, j) {
        switch (direction) {
          case 0:
            return j && [i, --j];
          case 1:
            return i !== this.sides - 1 && [++i, j];
          case 2:
            return j !== this.sides - 1 && [i, ++j];
          case 3:
            return i && [--i, j];
        }

      };
      Game.prototype.action = function (direction) {
        if (direction === 4) {
          this.restart()
        } else {
          var hopped = false;
          var dec = !direction || direction === 3;
          var horizontal = direction % 2;
          var start_i, start_j, i, j;
          i = start_i = dec ? 0 : (horizontal ? this.sides - 1 : 0);
          j = start_j = dec ? 0 : (horizontal ? 0 : this.sides - 1);


          for (var p = 0; p < this.sides; p++) {
            for (var q = 0; q < this.sides; q++) {
              if (this.tiles[this.coordID(i, j)]) {
                hopped = this.hop(direction, i, j) || hopped;
                if (this.over()) return this.loose();
              }
              if (horizontal) {
                dec ? i++ : i--;
              } else {
                dec ? j++ : j--;
              }
            }
            if (horizontal) {
              i = start_i;
              j++;
            } else {
              j = start_j;
              i++;
            }
          }
          hopped && this.spawn();
          if (this.over()) return this.loose();


        }
      };
      Game.prototype.newTile = function (i, j, v) {
        this.tiles[this.coordID(i, j)] = new Tile(this, i, j, v);
      };

      Game.prototype.isEdge = function (c) {
        return c === 0 || c === this.sides - 1;
      };

      Game.prototype.mergeTiles = function (from, to) {
        this.score.current += this.tiles[this.coordID(to[0], to[1])].double();
        this.tiles[this.coordID(from[0], from[1])].move(to[0], to[1], true);
        delete this.tiles[this.coordID(from[0], from[1])];
        this.updateScore();
        this.save();
      };

      function BoardBack(game) {
        this.game = game;
        this.new();
      }

      BoardBack.prototype['new'] = function () {
        this.surface = new Surface({size: [this.game.center_width, this.game.center_width], classes: ['game-container']});
        this.positionNode = new RenderNode(new StateModifier({
          size: [this.game.center_width, this.game.center_width],
          transform: Transform.scale(1.16, 1.16)
        }));

        this.positionNode._object.setTransform(
            Transform.scale(1, 1),
            board_animation
        );

        //this.game.centerNode.add(this.aesthetic_modifier).add(this.surface);

        this.game.boardNode.add(this.positionNode).add(this.surface);
        this.surface.pipe(this.game.nodes);

      };
      BoardBack.prototype.tiles = function () {
        this.tile_slots = [];
        for (var i = 0; i < this.game.sides; i++) {
          for (var j = 0; j < this.game.sides; j++) {
            this.tile_slots.push(new Tile(this.game, i, j, 0));
          }
        }
      };

      BoardBack.prototype.destroy = function () {
        //destroy surface
        // till i find out how to dispose a surface I shall use this inefficient method!
        this.surface.setProperties({visibility: 'hidden'});
        for (var i = 0; i < this.tile_slots.length; i++) {
          this.tile_slots[i].destroy();
        }
      };
      BoardBack.prototype.rerender = function () {
        this.destroy();
        this.new();
      };

      function Tile(game, i, j, v) {
        this.game = game;
        this.i = i;
        this.j = j;
        this.v = v;
        this.new();
      }


      /**
       * pixel offset of the box w.r.t. a given cartesian coordinate `c`
       */
      Tile.prototype.coordLoc = function (c) {

        //return -( ((this.game.sides / 2 - (c)) * (this.game.tile_size + this.game.padding)) - ((this.game.tile_size + this.game.padding) / 2));

        return ( c * (this.game.tile_size + this.game.padding) + this.game.padding);
      };


      Tile.prototype['new'] = function () {

        this.surface = new Surface({
          size: [this.game.tile_size, this.game.tile_size],
          content: this.v,
          classes: ['tile', this.resolveClass(this.v)]
        });
        this.position_modifier = new StateModifier({
          transform: Transform.translate(this.coordLoc(this.i), this.coordLoc(this.j))
        });

        if (this.v) {
          this.aesthetic_modifier = new StateModifier({
            transform: Transform.scale(0, 0, 0)
          })
        } else {
          var board_middle = this.game.sides / 2;
          var diag = (this.i === this.j) || ((this.game.sides - 1 - this.i) === this.j);
          var shift_mag = 100;
          this.aesthetic_modifier = new StateModifier({
            transform: Transform.translate((this.i < board_middle ? -shift_mag : shift_mag) * (this.game.isEdge(this.j) ? (diag ? 1 : 0) : 1),
                this.j < board_middle ? -shift_mag : shift_mag * (this.game.isEdge(this.i) ? (diag ? 1 : 0) : 1)
            )
          });
        }


        if (this.v) {
          this.aesthetic_modifier.setTransform(
              Transform.scale(1, 1, 1),
              tile_animation
          );
        } else {
          this.aesthetic_modifier.setTransform(
              Transform.translate(0, 0),
              board_animation
          );
        }

        this.game.board_back.positionNode.add(this.position_modifier).add(this.aesthetic_modifier).add(this.surface);
        this.surface.pipe(this.game.nodes);
      };
      Tile.prototype.resolveClass = function (v) {
        return v ? ('tile-' + (v > 2048 ? 'super' : v)) : undefined
      };
      Tile.prototype.double = function () {
        this.v *= 2;

        var self = this;
        Timer.setTimeout(function () {
          //destroy tile
          self.rerender();
          if (self.v === 2048) self.game.win()

        }, tile_animation.period * 0.9);
        return this.v;

      };
      Tile.prototype.destroy = function () {
        //destroy surface
        // till i find out how to dispose a surface I shall use this inefficient method!
        this.surface.setProperties({visibility: 'hidden'})
      };

      Tile.prototype.rerender = function () {
        this.destroy();
        this.new();
      };
      Tile.prototype.move = function (i, j, destroy) {
        // on transform end destroy if(destroy)
        var self = this;
        this.position_modifier.setTransform(
            Transform.translate(this.coordLoc(i), this.coordLoc(j)),
            tile_animation,
            function () {
              destroy && self.destroy()
            }
        );
        this.i = i;
        this.j = j;
      };

      var game = new Game(4, Engine, Engine.createContext());
      window.onbeforeunload = function () {
        //game.save();
      };
    }
)
;
