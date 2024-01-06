## Introduction
This is a start of a devlog for a currently unnamed game that I am developing using GODOT game engine. It's a rogue-lite with RPG elements, mostly inspired by the game loop of Noita.
Every item will have an ability to add "upgrades" on it, where each swing will active chain of abilities ranging from "Set on Fire", "Do X more damage" to "Duplicate an enemy and send it back in time".
I will use this devlog to document my journey of developing this game.

## Project
Let's start with the Godot project itself, it needs a little bit of tweaking. 

![Pasted image 20231215170102](https://github.com/otykh/otykh.github.io/assets/102185236/6e157244-79f0-4c7c-bd83-e284c66e6f42)

The viewport Width and Height are set to these values since it scales quite nice.

![Pasted image 20231215170126](https://github.com/otykh/otykh.github.io/assets/102185236/dd3a9ed5-36d3-42d2-9dae-bbdaa94c668e)

The stretch is set to canvas_items, you can see the difference between canvas_items and viewport (the other option) in the below screenshot:

![Pasted image 20231215170428](https://github.com/otykh/otykh.github.io/assets/102185236/334d006f-1a0c-4e80-814f-888ea8a60380)

I will use the rotation + position using the animation manager, the canvas_items will be more consistent and look better.

### Hitboxes
In the below screenshot, we have 2 collision shapes. The green is for collision with the world, the cyan is acting like a hitbox. 

![Pasted image 20231215170822](https://github.com/otykh/otykh.github.io/assets/102185236/b91ea201-632a-4435-af4d-fcf6f361c985)

The reason they are different sizes is because the hitbox should **always** be smaller than the player. When the player tries to avoid being hit, the smaller hitbox will feel more forgiving and make the player think that they barely avoided the hit. This doesn't mean that hitboxes should **always** be smaller than the sprite, rather things like collectables need to have bigger hitbox.

### Movement

![Pasted image 20231215181932](https://github.com/otykh/otykh.github.io/assets/102185236/bb2fc782-23c0-4439-800e-74aa3cb04cba)

Using `ACCEL` of `10`, and using this function will help with smoothing the player's movement, this makes it feel much responsive and less robotic.

### Collisions
When I started learning Godot, collision's "layer" and "mask" were very confusing. Their names don't explicitly tell what they are. I made it easier for myself by remembering that Layer is "What am I?" and Mask is "What am I colliding with?".

![Pasted image 20231215183845](https://github.com/otykh/otykh.github.io/assets/102185236/6236707e-2469-4724-bda5-e4035649e5d8)

Example of what hitbox collision is set to.
Side Note: I think that this implementation is much better than in Unity. In Unity, ignoring collisions with certain objects is pain, setting to collide with specific things is also quite painful, as for each a new layer must be created. In Godot this is much more transparent, easier to use, and "layer"/"mask" are not concealed under options somewhere in the project configuration.

### Player Health
Have you ever got hit by an enemy, surviving with 1 HP? This is intentional, and is implemented to make the player feel like they barely avoided death, not only that instant death is avoided too. In this game, if `health_grace` is enabled, and previous health was larger then `50` and damage that is dealt is less then `1.5 * maxHealth`, player will survive with 1HP, avoiding death.

![Pasted image 20231215192321](https://github.com/otykh/otykh.github.io/assets/102185236/f55f6a9b-e0cb-4749-b262-a7b8ccfd3185)

### Color Magic

![Pasted image 20231215200246](https://github.com/otykh/otykh.github.io/assets/102185236/8dad9164-19ed-4235-a4da-3034799c9852)

I am using the tile set from Kenney: https://kenney-assets.itch.io/1-bit-pack
And while it is quite good, the only thing that I dislike that the characters have no background (see the player above), but given that it is free it's just a minor inconvenience.
I am using the monochrome version because Godot (and other engines) has a Modulate color, which means it will multiply given color by the sprite texture, which can make the player be set to any color (and by this, anything else in the game), thus giving much more flexibility to the colors of things in the game.
Not only that, it saves space. There is no need to have multiple identical sprites with different color.
This is quite a neat trick that can be used for, mostly UI elements, since those are usually repetitive, like for example NO button being red and YES button being green, etc. 

## Characters
### Navigation

![Pasted image 20231217193212](https://github.com/otykh/otykh.github.io/assets/102185236/d0968d99-d7e6-44be-bb81-0eece7e74276)

When I started developing this game I was using Godot 4.1, but when I got to implementing some basic navigation with tilemaps, there was no baking available for NavigationRegion2D. This means that I could not automatically set regions for NPC to walk on. The problem is not even that I would need to draw around each obstacle, but that the navigation does not account for agent's radius, this makes the drawing navigation a lot more work and is very error prone. But, in Godot 4.2 baking is now available! So that is the version I will be using from now on.

Also, the enemy will (for now) check every 2 seconds, if the player is 10 units away from the target position (where the agent is heading right now). If true, the path will be recalculated and the agent is going to get a new path. This is to minimize the performance hit of the pathfinding.
### Enemy AI
At first, I implemented enemy AI in a single script. It was quite simple, check line of sight, if saw the player then get alerted and follow the player position.

![Pasted image 20231218164526](https://github.com/otykh/otykh.github.io/assets/102185236/6d4c293a-3018-45fc-8d32-6b1efb02a810)

And the line of sight is also quite simple, checking first if the player can even get to our line of sight and then check the raycast.

![Pasted image 20231218171737](https://github.com/otykh/otykh.github.io/assets/102185236/148bf4ac-ef11-4d5b-be90-f58e20f84db0)

Here is the example of how it looks with collision shape debugs:

![Pasted image 20231218164552](https://github.com/otykh/otykh.github.io/assets/102185236/1f6bdd00-38ab-48e8-8a7f-31667ede7bbe)

You may have also noticed the pink box in front of the player, I will write about that later.

*After the implementation of this very simple AI, I faced an immediate problem. First, the code was unreadable, no matter how much I format it, it is very complicated, and this is now, where the AI is very, very simple. Not only that it resides in a single script, which also takes up a lot of enemy logic. Not to mention that I wanted to make the AI be modular, where a single scene (prefab) will be responsible for every character in the game.*
Because of this I decided to try a different implementation of the enemy AI, which is called *State Machines*.

## State Machines
This was the first 30 lines of the enemy script. The script in total consisted of 162 lines.

![Pasted image 20231222150640](https://github.com/otykh/otykh.github.io/assets/102185236/3c85850a-a029-4386-a306-3ac8fa94bf2a)

After the state machine implementation, it had shrunk down to 127 lines. And now looks like this:

![Pasted image 20231222164211](https://github.com/otykh/otykh.github.io/assets/102185236/4ac2ee9b-8b11-44ef-a68c-b75540c17de7)

The state machine itself looks like this in the enemy node tree:

![Pasted image 20231222164229](https://github.com/otykh/otykh.github.io/assets/102185236/c399d0c6-0746-4b5b-857a-89554431e211)

The basic idea of the State Machine, is that each node is like a state that the character is in, only one of each can be selected at a time. Each of them inherit from the virtual State class and override it's own functions. State machine is responsible for keeping track which state the character is right now, and for changing states. The example of how you would change states is like this: `machine.transition_to("Alerted")`, which would immediately make the character alerted.

This is a very elegant way of developing states, each state is referred by name, not it's class name, making it very easy to make the character behaviors. 
## Data
At first I want to describe what is the goal of the items/entities/objects in this game. Everything needs to be modular and rely on resources for the properties of an item. Example of that is the enemy is just a empty node with some things attached to it that will load it's appearance, inventory, health, items from a resource. This is done to keep everything in one place and not manage hundreds of small scenes. If creating an enemy using scenes I would need to have a `Controller` that stores each scene, it's variation and chance, where the scene will be loaded and placed. In the way that I want to do, is a Resource that will describe what object is, how it looks, how it acts without any need to make a scene for each own. This will save space and development time.

First, let's look at items. There is an `ItemResource`, which stores things like `name`, `description`, `sprite region`, `damage`, etc.  This is a `base` for each item, a skeleton of what the item is.
Than, there is `InventoryItem`, which is an item that takes `ItemResource` and adds some unique properties on top of it. These unique properties are just the upgrades, level of the item, basically things that will be modified at runtime.
Not forgetting to mention that `ItemResource` can be referred by their 'id' stored in `ItemCollection`, which is housed in a script called `Game` that is autoloaded at the start. To access a item base can be done by using `Game.items[id]`.
Each character has an inventory, a script called `Inventory` stores equipment for each arm, legs, head, torso, and general storage for each character, using `InventoryItem`  to record what each character has.

For the characters this is something that will definitely change in the future. 

![Pasted image 20240102160135](https://github.com/otykh/otykh.github.io/assets/102185236/9ae09f0b-9d15-476d-aa21-d86ab36745b5)

![Pasted image 20240102160143](https://github.com/otykh/otykh.github.io/assets/102185236/26983dc6-f87c-4f94-8bb8-21901cb62a0d)

For now each enemy is marked as `E` on the map, and has two options to choose from. Select random "Basic" enemy from "Type" or assign directly a `CharacterBase`.
`CharacterBase` is `CharacterResource`, which stores everything from health, speed, view distance, hit distance, etc. From this the enemy `base` is going to be loaded with `DefaultEquipment`.
`DefaultEquipment` is something that allows each character have slightly different setup, tho maybe overkill for this project, allows flexibility nearly everywhere. It records each item that can be assigned for head, arms, legs, chest, etc. and picks randomly using weights, that is, one item can have lower/higher chance of being picked than others.

![Pasted image 20240102160538](https://github.com/otykh/otykh.github.io/assets/102185236/c0573016-3559-45dc-b162-de85e9fff293)

Using that, the enemy will get the `DefaultEquipment` and try getting a random item, if item is selected, the item will be assigned.

![Pasted image 20240102160640](https://github.com/otykh/otykh.github.io/assets/102185236/93ac861c-b5ad-4d0d-98f7-ad031ab037f4)

Skeleton's item on the right hand recorded in `DefaultEquipment` where the `dagger` and `fast_sword` have 50/50 chance of being selected. 
Note: if chances do not add up to 100, the enemy might not have an item assigned. This is intentional.

*03/01/2024*
