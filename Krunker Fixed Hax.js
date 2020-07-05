// ==UserScript==
// @name         KrunkerJava Plus 𝓧v5
// @namespace   KrunkerJava Plus 𝓧v5
// @version      5.0
// @description  Get first place in game!
// @author       Krunker Jav
// @require      https://raw.githubusercontent.com/ygoe/msgpack.js/master/msgpack.min.js
// @match        *://krunker.io/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

/* eslint-disable no-caller */

(function() {
    // Variables
    var frameCount = 0;
    var vars = new Map();
    var script;
    var GUI;
    var showMenu = true;
    var menuDirty = true;
    var features = [];
    var updatedFeat = new Map();
    var positions = new Map();
    var downKeys = new Set();
    var objectDirty = false;
    var mouseDownL = false, mouseDownM = false, mouseDownR = false;
    var keyDown = (key) => downKeys.has(key);
    var isProxy = Symbol("isProxy");
    const twoPI = Math.PI * 2;
    const halfPI = Math.PI / 2;

    // Initialization
    function initialize() {

        addListener(document, "mousedown", event =>{
            const Left=0, Middle=1, Right=2;
            switch(event.button) {
                case Left: mouseDownL = true; break;
                case Middle: mouseDownM = true; break;
                case Right: mouseDownR = true; break;
                default: break;
            }
        });

        addListener(document, "mouseup", event =>{
            const Left=0, Middle=1, Right=2;
            switch(event.button) {
                case Left: mouseDownL = false; break;
                case Middle: mouseDownM = false; break;
                case Right: mouseDownR = false; break;
                default: break;
            }
        });

        addListener(document, "keyup", event => {
            if (downKeys.has(event.code)) downKeys.delete(event.code)
        });

        addListener(document, "keydown", event => {
            if ('INPUT' == document.activeElement.tagName || !window.endUI && window.endUI.style.display) return;
            switch (event.code) {
                case 'F1':
                    event.preventDefault();
                    showMenu ^= 1;
                    window.SOUND.play('tick_0', 0.1);
                    menuDirty = showMenu;
                    break;
                case 'F2':
                    saveAs("game_" + getVersion() + ".js", script);
                    break;
                default:
                    if (!downKeys.has(event.code)) downKeys.add(event.code);
                    for (const feature of features) {
                        if (feature && "Digit" + feature.key == event.code) {
                            if (feature.container.length) onUpdated(feature);
                            else if (typeof feature.myFunction === "function") feature.myFunction();
                        }
                    }
                    break;
            }
        });

        // GUI Init
        GUI = document.getElementById("myGUI");
        if (GUI == null) {
            GUI = document.createElement('div');
            GUI.id = "myGUI";
            GUI.style = "float:left;width:100%;background-color: rgba(0,0,0,0.25);border-radius:5%;text-align:right;line-height:0.8;margin-top:5%;";
        }

        //Add Features
        newFeature('Chams', "3", ['Off', 'On']);
        newFeature('WireFrame', "4", ['Off', 'On']);
        newFeature('Names', "5", ['Off', 'On']);
        newFeature('Bhop', "6", ['Off', 'Auto Jump', 'Key Jump', 'Auto Slide', 'Key Slide']);
        newFeature('AutoReload', "7", ['Off', 'On']);
        newFeature('AutoAim', "8", ['Off', 'Assist', 'Silent', 'IDGAF']);
        newFeature('Wallbangs', "9", ['Off', 'On']);

    }

    // Main Render Loop
    function RENDER(three, utils, colors, config, overlay, scale, game, controls, renderer, me, delta) {

        frameCount++; //frame timer
        if (frameCount >= 100000) {
            frameCount = 0;
        }

        //if (frameCount % 1000 == 0) {
        //    console.log("FRAME ", frameCount)
        //}

        if(me && renderer.scene) {
            //GUI Update
            const topLeft = document.getElementById("topLeftHolder");
            if (topLeft && GUI) {
                if (!topLeft.contains(GUI)) {
                    topLeft.appendChild(GUI);
                } else if (showMenu) {
                    if (menuDirty) {
                        menuDirty = false;
                        GUI.innerHTML = "<br><h4 style='text-align:center;color:#1E90FF;'>Krunker Java Plus 𝓧 Fixed</h4><hr>";
                        for (const feature of features) {
                            GUI.innerHTML += `<h5><span style='float:left;margin-left:10%;color:rgba(255,193,72,255)'>${feature.key}</span> <span style='float:left;margin-left:10%;color:rgba(255,255,255,255)'>${feature.name}</span> <span style=float:all;margin-right:10%;margin-left:10%;color:${feature.valueStr == "On" ? "#B2F252" : feature.valueStr == "Off" ? "#FF4444" : "#999EA5"};'>${feature.valueStr}</span></h5>`;
                        }
                        GUI.innerHTML += "<br>";
                    }
                } else if (GUI.innerHTML) GUI.innerHTML = null;
            }
            for (let[name, feature] of updatedFeat) {
                updatedFeat.delete(name);
            }

            // Rendering Related Features Update...

            // NameTags
            let getIsFriendly = (entity) => (me && me.team ? me.team : me.spectating ? 0x1 : 0x0) == entity.team;
            let getInView = (entity) => (null == game[vars.get("canSee").val](me, entity.pos.x, entity.pos.y, entity.pos.z, 10));
            const featureNames = getFeature('Names');
            game.players.list.filter(x => {
                return x && x.active && !x[vars.get("isYou").val] && x.hasOwnProperty('pos');
            }).forEach((player, index, array) => {
                player[vars.get("inView").val] = featureNames.value ? player.active : getIsFriendly(player) ? player.active : getInView(player);
            })

            // Chams / WireFrame
            const featureChams = getFeature('Chams');
            const featureWire = getFeature('WireFrame');
            for (const obj of renderer.scene.children) {
                if (obj instanceof three.Object3D) {
                    if (obj.name && obj.name.startsWith("playermap")) {
                        obj.visible = featureChams.value ? true : false;
                        obj.traverse(( child ) => {
                            if (child && child.type =="Mesh") {
                                child.material.depthTest = featureChams.value ? false : true;
                                child.material.opacity = featureChams.value ? 0.85 : 1.0;
                                child.material.transparent = featureChams.value ? true : false;
                                child.material.fog = featureChams.value ? false : true;
                                child.material.emissive.r = featureChams.value ? 0.25 : 0;
                                //child.material.emissive.g = featureChams.value ? 0.55 : 0;
                                child.material.emissive.b = featureChams.value ? 0.55 : 0;
                                child.material.wireframe = featureWire.value ? true : false;
                            }
                        })
                    }
                }
            }

            // camLookAt
            const featureAutoAim = getFeature('AutoAim');
            if (controls && (featureAutoAim.value > 1 || featureAutoAim.value == 1 && mouseDownR)) {
                if (void 0 == game.controls.camTarget) {
                    Object.defineProperty(controls, 'camTarget', { value: null });
                }
                else if (featureAutoAim.value == 1 && mouseDownR && controls.camTarget !== null || featureAutoAim.value > 1 && controls.camTarget !== null) {
                    const pchObjc = controls[vars.get("pchObjc").val];
                    pchObjc.rotation.x = controls.camTarget.xD;
                    pchObjc.rotation.x = Math.max(-halfPI, Math.min(halfPI, pchObjc.rotation.x));
                    controls.object.rotation.y = controls.camTarget.yD;
                    controls.yDr = pchObjc.rotation.x % Math.PI;
                    controls.xDr = controls.object.rotation.y % Math.PI;
                }
            }

            // inputs
            /*
            const isn = 0, speed = 1, ydir = 2, xdir = 3, move = 4, shoot = 5, scope = 6, jump = 7, crouch = 8, reload = 9, weaponKey = 10, weaponSwap = 11;
            if (controls.tmpInpts.length) {
                let input = controls.tmpInpts.shift();
                input[scope] = mouseDownR
                input[shoot] = mouseDownL
                const featureReload = getFeature('AutoReload');
                if (featureReload.value) {
                    let ammoLeft = me[vars.get("ammos").val][me[vars.get("weaponIndex").val]];
                    if (ammoLeft <= 1) {
                        input[reload] = 1;
                    }
                }
                frame ++;
                if (frame >= delta * 10) {
                    frame = 0;
                    //me.resetInputs();
                    me.inputs.pop();
                    me.inputs.push(input)
                }
            }*/
        }
    }

    // Main Input Loop
    function INPUTS(three, utils, colors, config, overlay, me, input, game, recon, lock) {
        const KEY = {
            frame : 0,
            delta : 1,
            xdir : 2,
            ydir : 3,
            moveDir : 4,
            shoot : 5,
            scope : 6,
            jump : 7,
            crouch : 8,
            reload : 9,
            weaponScroll : 10,
            weaponSwap : 11,
            moveLock : 12
        }

        //Auto Reload
        const featureReload = getFeature('AutoReload');
        if (featureReload.value) {
            let ammoLeft = me[vars.get("ammos").val][me[vars.get("weaponIndex").val]];
            if (ammoLeft <= 0) {
                input[KEY.reload] = 1;
            }
        }

        // bHop / slide
        const featureBhop = getFeature('Bhop');
        if (featureBhop && featureBhop.value) {
            if (keyDown("Space") || featureBhop.value !== 2 && featureBhop.value !== 4) {
                game.controls.keys[game.controls.jumpKey] ^= 1;
                game.controls.keys[game.controls.crouchKey] = (me.yVel < -0.04 && me.canSlide) && featureBhop.value !== 1 && featureBhop.value !== 2 ? 1 : 0;
            }
        }

        let camLookAt = (pos) => {
            if (pos === null || (pos.x + pos.y + pos.z) == 0) return void(game.controls.camTarget = null);
            let xdir = getXDire(game.controls.object.position.x, game.controls.object.position.y, game.controls.object.position.z, pos.x, pos.y, pos.z);
            let ydir = getDir(game.controls.object.position.z, game.controls.object.position.x, pos.z, pos.x);
            game.controls.camTarget = {
                xD:xdir,
                yD: ydir,
                x: pos.x + config.camChaseDst * Math.sin(ydir) * Math.cos(xdir),
                y: pos.y - config.camChaseDst * Math.sin(xdir),
                z: pos.z + config.camChaseDst * Math.cos(ydir) * Math.cos(xdir)
            }
        }

        let getIsFriendly = (entity) => (me && me.team ? me.team : me.spectating ? 0x1 : 0x0) == entity.team;
        let getInView = (entity) => (null == game[vars.get("canSee").val](me, entity.pos.x, entity.pos.y, entity.pos.z));
        let enemies = game.players.list.filter(x => {
            return x.active && !x[vars.get("isYou").val] && !getIsFriendly(x)
        })

        enemies.forEach((enemy, index, array) => {
            let key = enemy.sid; //game.players.indexBySid(enemy.sid);
            if (positions.has(key)) {
                let pos = positions.get(key);
                enemy.pos = new three.Vector3(pos.x, pos.y + enemy.height - config.cameraHeight - enemy[vars.get("crouchVal").val] * config.crouchDst, pos.z)
            }
        })

        let pchObjc = game.controls[vars.get("pchObjc").val];
        let ty = game.controls.object.rotation.y;
        let tx = pchObjc.rotation.x;

        let target = enemies.filter(x => {
            return x.hasOwnProperty('pos') && getInView(x)
        }).sort((p1, p2) => p1.pos.distanceToSquared(me) - p2.pos.distanceToSquared(me)).shift();

        // bHop / slide
        const featureAutoAim = getFeature('AutoAim');
        //newFeature('AutoAim', "8", ['Off', 'Assist', 'Silent', 'IDGAF']);
        if (featureAutoAim.value && target) {
            if (featureAutoAim.value !== 2) camLookAt(target.pos);
            if (featureAutoAim.value > 1) {
                if (me.weapon[vars.get("nAuto").val] && me[vars.get("didShoot").val]) {
                    input[KEY.shoot] = 0;
                } else if (!me[vars.get("aimVal").val]) {
                    input[KEY.scope] = 1;
                    input[KEY.shoot] = 1;
                } else {
                    input[KEY.scope] = 1;
                }
            }

            ty = getDir(game.controls.object.position.z, game.controls.object.position.x, target.pos.z, target.pos.x);
            tx = getXDire(game.controls.object.position.x, game.controls.object.position.y, game.controls.object.position.z, target.pos.x, target.pos.y, target.pos.z);
            tx -= (0.3 + me.recoilForce) * me[vars.get("recoilAnimY").val];
        }
        else {
            camLookAt(null);
            //input[KEY.scope] = 0;
        }
        // silent aim
        if (featureAutoAim.value) {
            input[KEY.ydir] = (tx % twoPI).toFixed(3) * 0x3e8;
            input[KEY.xdir] = (ty % twoPI).toFixed(3) * 0x3e8;
        }
    }


    // Set Variable Object Entries
    let setVars = function() {
        vars
        .set("xDire", {regex:/this\['(\w+)']=\w+\['round']\(0x3\),this\['\w+']=\w+\['round']\(0x3\)/,pos:1})
        .set("yDire", {regex:/this\['(\w+)']>Math\['PI']\/0x2\?this\['\w+']=Math\['PI']\/0x2/,pos:1})
        .set("isYou", {regex:/this\['\w+']=k,this\['(\w+)']=w,this\['\w+']=!0x0/,pos:1})
        .set("inView", {regex:/if\(!\w+\['(\w+)']\)continue/,pos:1})
        .set("ammos", {regex:/\['noReloads']\|\|!\w\['\w+']&&\w\['(\w+)']/,pos:1})
        .set("weaponIndex", {regex:/\['noReloads']\|\|!\w\['\w+']&&\w\['\w+']\[\w\['(\w+)']]/,pos:1})
        .set("procInputs", {regex:/this\['(\w+)']=function\((\w+),(\w+),\w+,\w+\){(this)\['recon']/,pos:1})
        .set("swapWeapon", {regex:/\w+\['(\w+)']\(this,null,null,void 0x0,0x0,\w+\):\w+\[0xa]&&\w+\['\w+']\(this,\w+\[0xa],!0x1,void 0x0,void 0x0,\w+\)/,pos:1})
        .set("aimVal", {regex:/&&0x1==\w\['(\w+)']&&!\w/,pos:1})
        .set("pchObjc", {regex:/0x0,this\['(\w+)']=new \w+\['Object3D']\(\),this/,pos:1})
        .set("didShoot", {regex:/--,\w+\['(\w+)']=!0x0/,pos:1})
        .set("nAuto", {regex:/'(\w+)':!0x0,'burst':/,pos:1})
        .set("crouchVal", {regex:/this\['(\w+)']\+=\w\['crouchSpeed']\*\w+,0x1<=this\['\w+']/,pos:1})
        .set("recoilAnimY", {regex:/\w*1,this\['\w+'\]=\w*0,this\['\w+'\]=\w*0,this\['\w+'\]=\w*1,this\['\w+'\]=\w*1,this\['\w+'\]=\w*0,this\['\w+'\]=\w*0,this\['(\w+)'\]=\w*0,this\['\w+'\]=\w*0,this\['\w+'\]=\w*0,this\['\w+'\]=\w*0,/,pos:1})
        .set("canSee", {regex:/this\['(\w+)']=function\(\w+,\w+,\w+,\w+,\w+,\w+\){if\(!\w+\)return!0x1;/,pos:1})

        for (const [name, object] of vars.entries()) {
            let result = object.regex.exec(script);
            if ( result ) {
                object.val = result[object.pos];
                console.log("found: ", name, " at ", result.index, " value: ", object.val);
            } else {
                object.val = null;
                alert("Failed to find ", name);
            }
        }
    }

    // Decode The Vries
    let decodeText = function(str, array, xor) {
        for (var i = 0, il = array.byteLength; i < il; i ++) {
            str += String.fromCharCode(array.getUint8(i) ^ xor);
        }
        try {
            return decodeURIComponent( escape( str ) );
        } catch ( e ) {
            return str;
        }
    }

    // Get the game patch number
    let getVersion = function() {
		const elems = document.getElementsByClassName('terms');
		const version = elems[elems.length - 1].innerText;
        return version;
	}

    // Save Data to Disk
    let saveAs = function(name, data) {
        let blob = new Blob([data], {type: 'text/plain'});
        let el = window.document.createElement("a");
        el.href = window.URL.createObjectURL(blob);
        el.download = name;
        document.body.appendChild(el);
        el.click();
        document.body.removeChild(el);
    }

    // Check if Something is Defined
    let isDefined = function(object) {
        return void 0 !== object;
    }

    // Check if Something is a type
    let isType = function(item, type) {
        return typeof item === type;
    }

    // Various utility functions...
    let getD3D = function(x1, y1, z1, x2, y2, z2) {
        var dx = x1 - x2;
        var dy = y1 - y2;
        var dz = z1 - z2;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    };
    let getAngleDst = function (a, b) {
        return Math.atan2(Math.sin(b - a), Math.cos(a - b));
    };
    let getXDire = function(x1, y1, z1, x2, y2, z2) {
        var h = Math.abs(y1 - y2);
        var dst = getD3D(x1, y1, z1, x2, y2, z2);
        return (Math.asin(h / dst) * ((y1 > y2)?-1:1));
    };
    let getDir = function (x1, y1, x2, y2) {
        return Math.atan2(y1 - y2, x1 - x2);
    };
    let lineInRect = function(lx1, lz1, ly1, dx, dz, dy, x1, z1, y1, x2, z2, y2) {
        var t1 = (x1 - lx1) * dx;
        var t2 = (x2 - lx1) * dx;
        var t3 = (y1 - ly1) * dy;
        var t4 = (y2 - ly1) * dy;
        var t5 = (z1 - lz1) * dz;
        var t6 = (z2 - lz1) * dz;
        var tmin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6));
        var tmax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6));
        if (tmax < 0) return false;
        if (tmin > tmax) return false;
        return tmin;
    };

    // MutationObserver
    let addObserver = function(elm, check, callback, onshow = true) {
        return new MutationObserver((mutationsList, observer) => {
            if (check == 'src' || onshow && mutationsList[0].target.style.display == 'block' || !onshow) {
                callback(mutationsList[0].target);
            }
        }).observe(elm, check == 'childList' ? {
            childList: true
        } : {
            attributes: true,
            attributeFilter: [check]
        });
    }

    // Event Listener
    let addListener = function(elm, type, callback = null) {
        if (!isDefined(elm)) { alert("Failed creating " + type + "listener"); return }
        elm.addEventListener(type, event => callback(event));
    }

    // Storage
    let canStore = (typeof(Storage) !== "undefined");
    let saveVal = function(name, val) {
        if (canStore) localStorage.setItem(name, val);
    }
    let deleteVal = function(name) {
        if (canStore) localStorage.removeItem(name);
    }
    let getSavedVal = function(name) {
        if (canStore) return localStorage.getItem(name);
        return null;
    }

    //Features
    let newFeature = (name, keyBind, array, myFunction = null) => {
        const cStruct = (...keys) => ((...v) => keys.reduce((o, k, i) => {
            o[k] = v[i];
            return o
        }, {}));
        let item = [];
        const myStruct = cStruct('name', 'key', 'value', 'valueStr', 'container', 'myFunction')
        const value = parseInt(getSavedVal("utilities_" + name) || 0);
        const feature = myStruct(name, keyBind, value, array.length ? array[value] : '', array, myFunction);
        if (array.length || myFunction) features.push(feature);
        item.push(feature);
        return item;
    }

    let getFeature = (name) => {
        for (const feature of features) {
            if (feature.name.toLowerCase() === name.toLowerCase()) {
                return feature;
            }
        }
        return null;
    }

    let onUpdated = (feature) => {
        window.SOUND.play('tick_0', 0.1);
        if (feature.container.length) {
            feature.value += 1;
            if (feature.value > feature.container.length - 1) {
                feature.value = 0;
            }
            feature.valueStr = feature.container[feature.value];
            saveVal("utilities_" + feature.name, feature.value);
        }
        if (feature.container.length == 2 && feature.container[0] == 'Off' && feature.container[1] == 'On') {
            console.debug(feature.name, " is now ", feature.valueStr);
            if (feature.name == "Wallbangs") objectDirty = true;
        }

        if (!updatedFeat.has(feature.name)) {
            console.debug(feature.name, " - Update Pending ")
            updatedFeat.set(feature.name, feature);
        }

        menuDirty = true;
    }

    // Exploit game...
    let hookChain = function(three, utils, colors, config, overlay) {

        overlay.render = new Proxy(overlay.render, {
            apply: function(target, that, [scale, game, controls, renderer, me, delta]) {

                if (me && me.active) {

                    if (!me[vars.get("procInputs").val][isProxy]) {
                        me[vars.get("procInputs").val] = new Proxy(me[vars.get("procInputs").val], {
                            apply: function(target, that, [input, game, recon, lock]) {
                                if (that) INPUTS(three, utils, colors, config, overlay, that, input, game, recon, lock)
                                return target.apply(that, [input, game, recon, lock]);
                            },
                            get: function(target, key) {
                                const value = Reflect.get(target, key)
                                return key === isProxy ? true : value;
                            },
                        })
                    }

                    RENDER(three, utils, colors, config, overlay, scale, game, controls, renderer, me, delta);
                }

                const featureWallbangs = getFeature('Wallbangs');
                if (! game.map.manager.addBlock[isProxy]) {
                    game.map.manager.addBlock = new Proxy(game.map.manager.addBlock, {
                        apply: function(target, that, args) {
                            if (args[7] && args[7].penetrable) {
                                args[7].transparent = featureWallbangs.value ? true : false;
                                args[7].opacity = featureWallbangs.value ? 0.75 : 1.0;
                            }
                            return target.apply(that, args);
                        },
                        get: function(target, key) {
                            const value = Reflect.get(target, key)
                            return key === isProxy ? true : value;
                        }
                    })
                }

                if (objectDirty) {
                    game.map.manager.objects.filter(x => {
                        return x.penetrable
                    }).map((obj, index, array) => {
                        obj.transparent = featureWallbangs.value ? true : false;
                        obj.opacity = featureWallbangs.value ? 0.75 : 1.0;
                    });
                    objectDirty = false;
                }

                return target.apply(that, [scale, game, controls, renderer, me, delta]);
            }
        });
    }

    window.WebSocket = new Proxy(window.WebSocket, {
        construct: function(target, args) {

            const ws = new target(...args);

            // WebSocket "onopen"
            const openHandler = (event) => {
                console.log('Open', event);
            };

            // WebSocket "onmessage"
            const messageHandler = (event) => {
                let typedArray = new Uint8Array(event.data);
                let [id, ...data] = window.msgpack.decode(typedArray);

                switch (id)
                {
                    case "k":
                        {
                            const sz = data[1];
                            const el = data[0];
                            const al = 0x203300F;
                            const mp = 0x3e8;
                            for (let i = 0; i < el.length; ++ i) {
                                if(i == 0 || i % sz == 0) {
                                    let sid = el[i];
                                    let pos = {x:0,y:0,z:0};
                                    pos.x = (el[i + 1] ^ al) / mp
                                    pos.y = (el[i + 2] ^ al) / mp
                                    pos.z = (el[i + 3] ^ al) / mp
                                    positions.set(sid, pos);
                                }
                            }
                        }
                        break;
                }
                // Not changing any data so this is not used atm
                //typedArray = window.msgpack.encode([id, ...data]);
                //Object.defineProperty(event, 'data', {
                //    value: typedArray.buffer
                //});
            };

            // WebSocket "onclose"
            const closeHandler = (event) => {
                console.log('Close', event);
                // remove event listeners
                ws.removeEventListener('open', openHandler);
                ws.removeEventListener('message', messageHandler);
                ws.removeEventListener('close', closeHandler);
            };

            // add event listeners
            ws.addEventListener('open', openHandler);
            ws.addEventListener('message', messageHandler);
            ws.addEventListener('close', closeHandler);

            // proxied send
            ws.send = new Proxy(ws.send, {
                apply: function(target, that, args) {
                    //console.log('Send', args);
                    target.apply(that, args);
                }
            });

            return ws;
        }
    })

    Response.prototype.arrayBuffer = new Proxy(Response.prototype.arrayBuffer, {
        apply: function(target, that, args) {
            const returnValue = target.apply(that, args);
            returnValue.then(buffer => {
                script = decodeText("", new DataView(buffer), 0x69);
                setVars();
                initialize();
            });
            return returnValue;
        }
    })

    Object.freeze = new Proxy(Object.freeze, {
        apply: function(target, that, args) {
            let Caller = arguments.callee.caller;
            if (Caller && Caller.arguments.length == 5 && Caller.arguments[0].ACESFilmicToneMapping) {
                hookChain(...Caller.arguments);
                Object.freeze = target;
            }
            return target.apply(that, args);
        }
    });

    /* Backup Method
    window.TextDecoder.prototype.decode = new Proxy(window.TextDecoder.prototype.decode, {
        apply: function(target, that, args) {
            let returnValue = target.apply(that, args);
            if (returnValue.length > 1050000) {
                script = returnValue;
                setVars();
                initialize();
            }
            return returnValue;
        }
    })
    */

    /* Future Exploit
    Object.setPrototypeOf = new Proxy(Object.setPrototypeOf, {
        apply: function(target, that, args) {
            if (args[0].isPlayer) {
                args[0].module = args[1].$$;
                console.dir(args)
            }
            return target.apply(that, args);
        }
    });
    */
})();
