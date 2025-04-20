// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
  }

  calcSpeed() {
    this.speed = this.distance / this.duration / 60;
    return this.speed;
  }
}

class App {

  #map;
  #mapEvent;
  #mapZoomLevel = 15;
  #workouts = [];

  constructor() {
    this.#getPosition();

    this.#getLocalStorage();

    form.addEventListener('submit', this.#newWorkout.bind(this));

    inputType.addEventListener('change', this.#toggleElevationField);

    containerWorkouts.addEventListener('click',this.#moveToPopup.bind(this));
  }

  #cancelWorkout(e) {
    if (e.key === 'Escape') {
      document.activeElement.blur();
      this.#hideForm();
    }

  }

  #getPosition() {
    navigator.geolocation.getCurrentPosition(this.#loadMap.bind(this), () =>
      alert('Error getting location')
    );
  }

  #loadMap(pos) {
    const { latitude, longitude } = pos.coords;
    const coords = [latitude, longitude];
    //leaflet library below
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel); //first is position map is set on and second is zoom level

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      //Represents how map looks
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this.#showForm.bind(this));
    this.#workouts.forEach(workout => this.#renderWorkoutMarker(workout));
  }

  #hideForm() {
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
      '';
    form.classList.add('hidden');
  }

  #showForm(e) {
    this.#mapEvent = e;
    form.classList.remove('hidden');
    inputDistance.focus();
    document.addEventListener('keydown', this.#cancelWorkout.bind(this), { once: true });
  }

  #toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  #newWorkout(e) {
    const validInput = (...inputs) => inputs.every(input => Number.isFinite(input) && input && input > 0);
    e.preventDefault();

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (!validInput(distance, duration, cadence))
        return alert("Invalid input");

      workout = new Running([lat, lng], distance, duration, cadence);
      this.#workouts.push(workout);
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (!validInput(distance, duration, elevation))
        return alert("Invalid input");

      workout = new Cycling([lat, lng], distance, duration, elevation);
      this.#workouts.push(workout);
    }

    this.#renderWorkoutMarker(workout);

    this.#renderWorkout(workout);

    this.#hideForm();

    this.#setLocalStorage();

  }

  #workoutDescription(workout){
    return `${workout.type[0].toUpperCase() + workout.type.slice(1)} on ${months[workout.date.getMonth()]} ${workout.date.getDate()}`
  }

  #renderWorkout(workout) {
    const li = document.createElement('li');
    li.classList.add('workout', `workout--${workout.type}`);
    li.setAttribute('data-id', workout.id);
    li.innerHTML = `
    <h2 class="workout__title">${this.#workoutDescription(workout)}</h2>
    <div class="workout__details">
      <span class="workout__icon">${workout.type == 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.type == 'running' ? workout.calcPace().toFixed(2) : workout.calcSpeed().toFixed(2)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">${workout.type == 'running' ? '🦶🏼' : '⛰'}</span>
      <span class="workout__value">${workout.type == 'running' ? workout.cadence : workout.elevation}</span>
      <span class="workout__unit">spm</span>
    </div>`;
    form.insertAdjacentElement('afterend',li);
  }

  #renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          minWidth: 100,
          maxWidth: 250,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(`${this.#workoutDescription(workout)}`)
      .openPopup();
  }

  #moveToPopup(e){
    const workoutEl = e.target.closest('.workout');
    if(!workoutEl)  return;

    const workout = this.#workouts.find(work => work.id === workoutEl.getAttribute('data-id'));
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate : true,
      pan: {
        duration : 0.8
      }
    });
  }

  #setLocalStorage(){
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  #getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
  
    this.#workouts = data.map(obj => {
      let workout;
      if (obj.type === 'running')
        workout = new Running(obj.coords, obj.distance, obj.duration, obj.cadence);
      if (obj.type === 'cycling')
        workout = new Cycling(obj.coords, obj.distance, obj.duration, obj.elevation);
  
      workout.id = obj.id;
      workout.date = new Date(obj.date);
  
      this.#renderWorkout(workout);
      return workout;
    });
  }

  reset(){
    localStorage.clear();
    location.reload();
  }
}

const app = new App();
