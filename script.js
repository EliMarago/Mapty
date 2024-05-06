'use strict';

// prettier-ignore

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const edit = document.querySelector('.menu__item--edit');
const deleteList = document.querySelector('.menu__item menu__item--delete');
const menuContainer = document.querySelector('.menu');
const clearList = document.querySelector('.menu__item--clear');
const popup = document.querySelectorAll('.leaflet-popup-content-wrapper');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; /// km
    this.duration = duration; // min
  }
  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    //  min / km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, ElevGain) {
    super(coords, distance, duration);
    this.ElevGain = ElevGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    // km / h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -10], 5.5, 20, 190);
// const cycling1 = new Cycling([50, -20], 20, 40, 430);
// console.log(run1, cycling1);

////////////////////////////////////////////////////////////

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // this._getPosition();
    this._getLocalStorage();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    containerWorkouts.addEventListener('click', this._openWindow.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    containerWorkouts.addEventListener('click', this._openMenu.bind(this));
  }

  _openWindow(e) {
    if (e.target.tagName !== 'svg' && e.target.tagName !== 'use') return;
    const workoutElement = e.target.closest('.workout');
    if (!workoutElement) return;

    const menuBox = workoutElement.querySelector('.menu');
    // Assicurati che menuBox non sia null prima di tentare di accedere alle sue classi
    if (menuBox) {
      // Rimuovi la classe che nasconde il menu
      menuBox.classList.toggle('menu__hidden');
    }
  }
  _openMenu(e) {
    if (!e.target.classList.contains('icon_dots')) return;
    const menuBox = document.querySelector('.menu');
    if (menuBox) {
      menuBox.classList.toggle('menu__hidden');
    }
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(
      `https://www.google.com/maps/@${latitude},${longitude},15z?entry=ttu`
    );

    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // L.marker(coords)
    //   .addTo(map)
    //   .bindPopup('A pretty CSS popup.<br> Easily customizable.')
    //   .openPopup();

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._workoutMarker(work);
    });
  }
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    this.#workouts.push(workout);
    console.log(workout);
    this._workoutMarker(workout);

    this._renderWorkout(workout);

    this._hideForm();

    this._setLocalStorage();
  }
  _workoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴🏻‍♀️'}${workout.description}`
      )
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `
 <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <h2 class="workout__title">${workout.description}</h2>
    <svg class="icon_dots" style="color: rgb(143, 143, 143);" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" fill="none"></rect><circle cx="128" cy="128" r="16"></circle><circle cx="64" cy="128" r="16"></circle><circle cx="192" cy="128" r="16"></circle></svg>
     <div class="workout__details">
     
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴🏻‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱️</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === 'running')
      html += `
       <div class="workout__details">
      <span class="workout__icon">⚡️</span>
     <span class="workout__value">${workout.pace.toFixed(1)}</span>
       <span class="workout__unit">min/km</span>
      </div>
       <div class="workout__details">
       <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
      </div>
    </li>
`;
    if (workout.type === 'cycling')
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
      <span class="workout__icon">⛰️</span>
      <span class="workout__value">${workout.ElevGain}</span>
      <span class="workout__unit">m</span>
      </div>
      </li>`;
    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    if (!this.#map) return;
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
  //reset tutti i ticket creati
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}
const app = new App();
app._getPosition();

document.addEventListener('DOMContentLoaded', function () {
  const deleteList = document.querySelector('.menu__item--delete');
  const menuContainer = document.querySelector('.menu');
  const containerWorkouts = document.querySelector('.workouts');

  if (deleteList) {
    deleteList.addEventListener('click', function () {
      containerWorkouts.remove(); // Rimuovi tutti gli elementi con la classe .workouts
      localStorage.removeItem('workouts'); // Rimuovi i dati dallo storage locale
      menuContainer.classList.add('menu__hidden');
      location.reload();
    });
  }
});
clearList.addEventListener('click', function () {
  // Nascondi gli elementi popup
  popup.forEach(element => {
    element.style.display = 'none'; // Imposta la visibilità su "hidden"
  });

  // Aggiungi un ritardo prima di rimuovere .workouts e nascondere il menu
  setTimeout(() => {
    containerWorkouts.remove(); // Rimuovi tutti gli elementi con la classe .workouts
    menuContainer.classList.add('menu__hidden'); // Nascondi il menu
  }, 500); // 500 millisecondi di ritardo
});
